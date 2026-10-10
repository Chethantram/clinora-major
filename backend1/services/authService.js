const {
  createHash,
  randomBytes,
  scrypt: scryptCallback,
  timingSafeEqual,
} = require('crypto');
const { promisify } = require('util');
const { ObjectId } = require('mongodb');
const { getMongoDb } = require('../db/mongo');

const scrypt = promisify(scryptCallback);
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
let authStoragePromise;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function publicUser(user) {
  return {
    id: user.id || String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || user.specialty || null,
    phone: user.phone || null,
  };
}

function defaultUserPreferences() {
  return {
    notifications: { critical: true, lab: true, drug: true, email: false },
    assistant: { briefs: true, trends: true, guidelines: true, interactions: true },
  };
}

function normalizeUserPreferences(value = {}) {
  const defaults = defaultUserPreferences();
  const notifications = value.notifications || {};
  const assistant = value.assistant || {};
  return {
    notifications: Object.fromEntries(Object.entries(defaults.notifications).map(([key, fallback]) => [
      key,
      typeof notifications[key] === 'boolean' ? notifications[key] : fallback,
    ])),
    assistant: Object.fromEntries(Object.entries(defaults.assistant).map(([key, fallback]) => [
      key,
      typeof assistant[key] === 'boolean' ? assistant[key] : fallback,
    ])),
  };
}

async function findDoctorById(users, userId) {
  const id = String(userId || '');
  const identityFilters = [{ id }];
  if (/^[a-f\d]{24}$/i.test(id) && ObjectId.isValid(id)) identityFilters.push({ _id: new ObjectId(id) });
  return users.findOne({ role: 'doctor', $or: identityFilters });
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, 64);
  return `scrypt$${salt}$${derivedKey.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [scheme, salt, hash] = String(storedHash || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = await scrypt(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

async function migrateLegacyUsers(users) {
  const legacyDocuments = await users.find({
    $or: [{ doctors: { $exists: true } }, { patients: { $exists: true } }],
  }).toArray();

  for (const document of legacyDocuments) {
    for (const role of ['doctor', 'patient']) {
      const records = document[`${role}s`] || [];
      for (const record of records) {
        const email = normalizeEmail(record.email);
        if (!email || !record.password) continue;
        const account = {
          id: record.id || null,
          name: String(record.name || '').trim(),
          email,
          role,
          department: record.department || record.specialty || null,
          phone: record.phone || null,
          password_hash: await hashPassword(String(record.password)),
          created_at: new Date(),
        };
        await users.updateOne({ email }, { $setOnInsert: account }, { upsert: true });
      }
    }
    await users.deleteOne({ _id: document._id });
  }
}

async function getAuthStorage() {
  const db = await getMongoDb();
  const users = db.collection('users');
  const sessions = db.collection('sessions');
  await migrateLegacyUsers(users);
  await Promise.all([
    users.createIndex({ email: 1 }, {
      unique: true,
      partialFilterExpression: { email: { $type: 'string' } },
    }),
    sessions.createIndex({ session_hash: 1 }, { unique: true }),
    sessions.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }),
  ]);
  return { users, sessions };
}

function ensureAuthStorage() {
  if (!authStoragePromise) {
    authStoragePromise = getAuthStorage().catch((error) => {
      authStoragePromise = null;
      throw error;
    });
  }
  return authStoragePromise;
}

async function registerDoctor({ name, email, password, department, phone }) {
  const { users } = await ensureAuthStorage();
  const account = {
    id: `D-${randomBytes(6).toString('hex').toUpperCase()}`,
    name: name.trim(),
    email: normalizeEmail(email),
    role: 'doctor',
    department: String(department || '').trim() || null,
    phone: String(phone || '').trim() || null,
    password_hash: await hashPassword(password),
    created_at: new Date(),
  };

  await users.insertOne(account);
  return publicUser(account);
}

async function login({ email, password, role }) {
  const { users, sessions } = await ensureAuthStorage();
  const account = await users.findOne({ email: normalizeEmail(email), role });
  if (!account || !(await verifyPassword(password, account.password_hash))) return null;

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await sessions.insertOne({
    session_hash: hashSessionToken(token),
    user_id: account._id,
    created_at: new Date(),
    expires_at: expiresAt,
  });

  return { token, expiresAt, user: publicUser(account) };
}

async function getSession(token) {
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) return null;
  const { users, sessions } = await ensureAuthStorage();
  const session = await sessions.findOne({
    session_hash: hashSessionToken(token),
    expires_at: { $gt: new Date() },
  });
  if (!session) return null;
  const user = await users.findOne({ _id: session.user_id });
  if (!user) {
    await sessions.deleteOne({ _id: session._id });
    return null;
  }
  return publicUser(user);
}

async function getUserSettings(userId) {
  const { users } = await ensureAuthStorage();
  const user = await findDoctorById(users, userId);
  if (!user) return null;
  return {
    profile: publicUser(user),
    preferences: normalizeUserPreferences(user.preferences),
  };
}

async function updateUserSettings(userId, { profile, preferences }) {
  const { users } = await ensureAuthStorage();
  const user = await findDoctorById(users, userId);
  if (!user) return null;

  await users.updateOne(
    { _id: user._id },
    {
      $set: {
        name: profile.name,
        phone: profile.phone || null,
        department: profile.department || null,
        preferences: normalizeUserPreferences(preferences),
        updated_at: new Date(),
      },
    }
  );

  return getUserSettings(userId);
}

async function deleteSession(token) {
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) return;
  const { sessions } = await ensureAuthStorage();
  await sessions.deleteOne({ session_hash: hashSessionToken(token) });
}

function requireSession() {
  return async (req, res, next) => {
    try {
      const cookie = String(req.headers.cookie || '')
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith('medai_auth='));
      const token = cookie ? cookie.slice('medai_auth='.length) : '';
      const user = await getSession(token);
      if (!user) return res.status(401).json({ error: 'Authentication required' });
      if (user.role !== 'doctor') return res.status(403).json({ error: 'Clinician access required' });
      req.user = user;
      return next();
    } catch {
      return res.status(503).json({ error: 'Authentication service unavailable' });
    }
  };
}

module.exports = {
  SESSION_TTL_MS,
  deleteSession,
  getSession,
  getUserSettings,
  login,
  normalizeEmail,
  registerDoctor,
  requireSession,
  updateUserSettings,
};
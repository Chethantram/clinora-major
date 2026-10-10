const crypto = require('crypto');
const express = require('express');
const { deleteSession, getSession, login, registerDoctor } = require('../services/authService');

const router = express.Router();
const COOKIE_NAME = 'medai_auth';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readCookie(req, name) {
  const prefix = `${name}=`;
  const entry = String(req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : '';
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    ...(process.env.AUTH_COOKIE_DOMAIN ? { domain: process.env.AUTH_COOKIE_DOMAIN } : {}),
  };
}

function setSessionCookie(res, session) {
  res.cookie(COOKIE_NAME, session.token, {
    ...cookieOptions(),
    expires: session.expiresAt,
  });
}

function inviteCodeMatches(providedCode) {
  const expectedCode = String(process.env.DOCTOR_REGISTRATION_CODE || '');
  const provided = Buffer.from(String(providedCode || ''));
  const expected = Buffer.from(expectedCode);
  return expected.length > 0 && provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

router.post('/register', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');
  const department = String(req.body?.department || req.body?.specialty || '').trim();
  const phone = String(req.body?.phone || '').trim();

  if (!inviteCodeMatches(req.body?.registrationCode)) {
    return res.status(403).json({ error: 'A valid doctor registration code is required' });
  }
  if (!name || name.length > 120 || !EMAIL_PATTERN.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Enter a valid name and email address' });
  }
  if (password.length < 12 || password.length > 256) {
    return res.status(400).json({ error: 'Password must be between 12 and 256 characters' });
  }

  try {
    const user = await registerDoctor({ name, email, password, department, phone });
    const session = await login({ email, password, role: 'doctor' });
    if (!session) return res.status(503).json({ error: 'Could not create a sign-in session' });
    setSessionCookie(res, session);
    return res.status(201).json({ user, role: 'doctor' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: 'Email already registered' });
    return res.status(503).json({ error: 'Registration service unavailable' });
  }
});

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim();
  const password = String(req.body?.password || '');
  const role = String(req.body?.role || '');
  if (!EMAIL_PATTERN.test(email) || !password || !['doctor', 'patient'].includes(role)) {
    return res.status(400).json({ error: 'Valid email, password and role are required' });
  }

  try {
    const session = await login({ email, password, role });
    if (!session) return res.status(401).json({ error: 'Invalid credentials' });
    setSessionCookie(res, session);
    return res.json({ user: session.user, role: session.user.role });
  } catch {
    return res.status(503).json({ error: 'Authentication service unavailable' });
  }
});

router.get('/session', async (req, res) => {
  try {
    const user = await getSession(readCookie(req, COOKIE_NAME));
    if (!user) return res.status(401).json({ authenticated: false });
    return res.json({ authenticated: true, user });
  } catch {
    return res.status(503).json({ error: 'Authentication service unavailable' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    await deleteSession(readCookie(req, COOKIE_NAME));
    res.clearCookie(COOKIE_NAME, cookieOptions());
    return res.json({ ok: true });
  } catch {
    return res.status(503).json({ error: 'Authentication service unavailable' });
  }
});

module.exports = router;
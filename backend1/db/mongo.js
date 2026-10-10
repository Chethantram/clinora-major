const { MongoClient } = require('mongodb');
const dns = require('dns');

let clientPromise = null;

function getMongoUri() {
  return String(process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
}

function getMongoDbName() {
  return String(process.env.MONGO_DB_NAME || 'clinsight').trim();
}

function isMongoConfigured() {
  return Boolean(getMongoUri());
}

function configureMongoDns() {
  const servers = String(process.env.MONGODB_DNS_SERVERS || '')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);
  if (servers.length) dns.setServers(servers);
}

async function getMongoDb() {
  const uri = getMongoUri();
  if (!uri) throw new Error('MONGODB_URI is not configured');
  configureMongoDns();

  if (!clientPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 20,
      minPoolSize: 0,
      maxIdleTimeMS: 300000,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 5000,
    });
    clientPromise = client.connect().then(() => client);
  }

  try {
    const client = await clientPromise;
    return client.db(getMongoDbName());
  } catch (error) {
    clientPromise = null;
    throw error;
  }
}

async function closeMongo() {
  if (!clientPromise) return;
  const client = await clientPromise.catch(() => null);
  clientPromise = null;
  if (client) await client.close();
}

module.exports = { closeMongo, getMongoDb, getMongoDbName, getMongoUri, isMongoConfigured };
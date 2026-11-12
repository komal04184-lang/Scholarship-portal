const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const env = require('./env');

// 1. PostgreSQL Connection Pool
const poolConfig = env.postgres.connectionString
  ? { connectionString: env.postgres.connectionString }
  : {
      host: env.postgres.host,
      port: env.postgres.port,
      database: env.postgres.database,
      user: env.postgres.user,
      password: env.postgres.password,
      max: env.postgres.max,
      idleTimeoutMillis: env.postgres.idleTimeoutMillis,
      connectionTimeoutMillis: env.postgres.connectionTimeoutMillis,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  return res;
}

async function getClient() {
  const client = await pool.connect();
  return client;
}

// 2. MongoDB Native Client (for application snapshots and document metadata)
let mongoClient = null;
let mongoDb = null;

async function connectMongo() {
  if (mongoDb) return mongoDb;
  try {
    mongoClient = new MongoClient(env.mongodb.uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db(env.mongodb.database);
    console.log(`✓ Connected to MongoDB database: ${env.mongodb.database}`);
    return mongoDb;
  } catch (err) {
    console.warn(`⚠️ MongoDB connection warning (Service will operate with PostgreSQL primary): ${err.message}`);
    return null;
  }
}

function getMongoDb() {
  return mongoDb;
}

async function closeConnections() {
  try {
    await pool.end();
  } catch (e) {}
  if (mongoClient) {
    try {
      await mongoClient.close();
    } catch (e) {}
  }
}

module.exports = {
  pool,
  query,
  getClient,
  connectMongo,
  getMongoDb,
  closeConnections,
};

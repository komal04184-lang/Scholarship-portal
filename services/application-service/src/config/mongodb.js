const { MongoClient } = require('mongodb');
const config = require('./index');

let client = null;
let db = null;

async function connectMongo() {
  if (db) return db;

  try {
    client = new MongoClient(config.mongo.uri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    await client.connect();
    db = client.db(config.mongo.database);
    console.log(`✓ Connected to MongoDB database: ${config.mongo.database}`);
    return db;
  } catch (err) {
    console.warn(`⚠️ MongoDB connection warning: ${err.message}. Flexible metadata store running in offline fallback mode.`);
    return null;
  }
}

function getDb() {
  return db;
}

async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

async function testConnection() {
  try {
    if (!db) await connectMongo();
    if (!db) return { connected: false, error: 'Database not initialized' };
    await db.command({ ping: 1 });
    return { connected: true, database: config.mongo.database };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

module.exports = {
  connectMongo,
  getDb,
  closeMongo,
  testConnection,
};


const { MongoClient } = require('mongodb');
const config = require('./index');
const logger = require('./logger');

let client = null;
let db = null;

async function connectMongo() {
  try {
    client = new MongoClient(config.mongo.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db(config.mongo.database);
    // Verify connection
    await db.command({ ping: 1 });
    logger.info('MongoDB connected successfully', { database: config.mongo.database });
    return true;
  } catch (err) {
    logger.error('MongoDB connection failed', { error: err.message });
    return false;
  }
}

function getDb() {
  if (!db) {
    throw new Error('MongoDB is not connected. Call connectMongo() first.');
  }
  return db;
}

async function closeMongo() {
  if (client) {
    await client.close();
    logger.info('MongoDB connection closed');
  }
}

module.exports = { connectMongo, getDb, closeMongo };

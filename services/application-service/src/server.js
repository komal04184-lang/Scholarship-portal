const app = require('./app');
const env = require('./config/env');
const { pool, connectMongo, closeConnections } = require('./config/database');
const logger = require('./utils/logger');

async function startServer() {
  logger.info('====================================================');
  logger.info(' APPLICATION MICROSERVICE STARTING (ApexScholar)   ');
  logger.info('====================================================');

  // 1. Verify PostgreSQL Database Connectivity
  try {
    const client = await pool.connect();
    logger.info(`✓ Connected to PostgreSQL Database: ${env.postgres.database}`);
    client.release();
  } catch (err) {
    logger.error(`❌ Critical: Could not connect to PostgreSQL Database: ${err.message}`);
    process.exit(1);
  }

  // 2. Connect to MongoDB (for snapshots & metadata)
  await connectMongo();

  // 3. Start Express HTTP Server
  const server = app.listen(env.port, () => {
    logger.info(`✓ Application Service running on port: ${env.port}`);
    logger.info(`✓ Environment: ${env.nodeEnv}`);
    logger.info(`✓ Health Check: http://localhost:${env.port}/health`);
    logger.info(`✓ API Base: http://localhost:${env.port}/api/v1/applications`);
    logger.info('====================================================');
  });

  // Graceful Shutdown
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await closeConnections();
      logger.info('Database pools closed. Exiting process.');
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('Forcefully terminating process after shutdown timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };


require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const config = require('./src/config');
const { testConnection: testPgConnection, pool } = require('./src/config/database');
const { connectMongo, closeMongo } = require('./src/config/mongodb');
const logger = require('./src/config/logger');

async function startServer() {
  try {
    logger.info('====================================================');
    logger.info(' APPLICATION MICROSERVICE STARTING');
    logger.info('====================================================');

    // 1. Test PostgreSQL connection
    const pgRes = await testPgConnection();
    if (pgRes.connected) {
      logger.info(`✓ Connected to PostgreSQL Database: ${pgRes.database}`);
    } else {
      logger.warn(`⚠️ PostgreSQL connection warning: ${pgRes.error}`);
    }

    // 2. Connect to MongoDB
    await connectMongo();

    // 3. Start HTTP server
    const server = http.createServer(app);
    server.listen(config.port, () => {
      logger.info(`✓ Application Service running on port: ${config.port}`);
      logger.info(`✓ Environment: ${config.nodeEnv}`);
      logger.info(`✓ Health Check: http://localhost:${config.port}/health`);
      logger.info(`✓ API Base: http://localhost:${config.port}/api/v1/applications`);
      logger.info('====================================================');
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down application service...`);
      server.close(async () => {
        try {
          await pool.end();
          logger.info('PostgreSQL pool closed.');
          await closeMongo();
          logger.info('MongoDB connection closed.');
          process.exit(0);
        } catch (err) {
          logger.error('Error during shutdown:', { error: err.message });
          process.exit(1);
        }
      });

      // Force terminate if graceful shutdown hangs
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    logger.error('❌ Failed to start application service:', { error: err.message });
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };


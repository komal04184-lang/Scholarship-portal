const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const { testConnection, closePool } = require('./config/database');
const { connectMongo, closeMongo } = require('./config/mongodb');

async function startServer() {
  logger.info('Initializing Online Scholarship Portal server...');

  // Connect to PostgreSQL
  const pgConnected = await testConnection();
  if (!pgConnected) {
    logger.warn('PostgreSQL connection could not be established immediately. Server will still start and retry queries on demand.');
  }

  // Connect to MongoDB
  const mongoConnected = await connectMongo();
  if (!mongoConnected) {
    logger.warn('MongoDB connection could not be established immediately. Document metadata store may be unavailable.');
  }

  const server = app.listen(config.port, () => {
    logger.info(`=======================================================`);
    logger.info(`Scholarship Portal Backend API running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
    logger.info(`API Base: http://localhost:${config.port}/api/v1`);
    logger.info(`Health check: http://localhost:${config.port}/api/v1/health`);
    logger.info(`=======================================================`);
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await closePool();
      await closeMongo();
      logger.info('Database connections closed. Process terminating.');
      process.exit(0);
    });

    // Force terminate if graceful shutdown hangs
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  logger.error('Fatal error starting server', { error: err.message, stack: err.stack });
  process.exit(1);
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const env = require('./config/env');
const { pool, testConnection } = require('./config/database');
const applicationRoutes = require('./routes/application.routes');
const documentRoutes = require('./routes/document.routes');
const internalRoutes = require('./routes/internal.routes');
const errorHandler = require('./middleware/error-handler');
const ApiResponse = require('./utils/api-response');

const app = express();

// Ensure upload directory exists
if (!fs.existsSync(env.upload.dir)) {
  fs.mkdirSync(env.upload.dir, { recursive: true });
}

// Security & Parsing Middlewares
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (!env.isProduction) {
  app.use(morgan('dev'));
}

// Root service welcome route
app.get('/', (req, res) => {
  return ApiResponse.success(res, 'ApexScholar Application Microservice is operational', {
    service: 'application-service',
    version: '2.0.0',
    port: env.port,
    database: env.postgres.database,
    status: 'online',
    endpoints: {
      health: `http://localhost:${env.port}/health`,
      applications: `http://localhost:${env.port}/api/v1/applications`,
      myApplications: `http://localhost:${env.port}/api/v1/applications/my`,
      adminApplications: `http://localhost:${env.port}/api/v1/applications/admin/all`,
    },
  });
});

// Top-Level Health Check Endpoint (PostgreSQL only, strictly NO MongoDB)
app.get('/health', async (req, res) => {
  let pgStatus = false;
  let pgDb = env.postgres.database;
  let pgUser = null;
  let pgTime = null;

  try {
    const resPg = await pool.query('SELECT current_database(), current_user, NOW() as current_time');
    pgStatus = true;
    pgDb = resPg.rows[0].current_database;
    pgUser = resPg.rows[0].current_user;
    pgTime = resPg.rows[0].current_time;
  } catch (e) {
    pgStatus = false;
  }

  const isHealthy = pgStatus;

  return res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'application-service',
    port: env.port,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      engine: 'PostgreSQL',
      connected: pgStatus,
      database: pgDb,
      user: pgUser,
      server_time: pgTime,
    },
    dependencies: {
      postgres: {
        connected: pgStatus,
        database: pgDb,
      },
      identity_service_url: env.services.identityServiceUrl,
      scholarship_service_url: env.services.scholarshipServiceUrl,
      review_service_url: env.services.reviewServiceUrl,
      payment_service_url: env.services.paymentServiceUrl,
    },
  });
});

// Mount Routes
// Document routes are sub-routes of /api/v1/applications/:id/documents
app.use('/api/v1/applications', documentRoutes);
app.use('/api/v1/applications', applicationRoutes);

// Compatibility aliases for legacy or gateway routes
app.use('/applications', documentRoutes);
app.use('/applications', applicationRoutes);

// Internal microservice endpoints
app.use('/internal', internalRoutes);

// 404 Route Handler
app.use((req, res) => {
  return ApiResponse.notFound(
    res,
    `Route ${req.method} ${req.originalUrl} not found on Application Service.`,
    'ROUTE_NOT_FOUND'
  );
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;

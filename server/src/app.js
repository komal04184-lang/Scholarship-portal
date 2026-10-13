const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const logger = require('./config/logger');
const { pool } = require('./config/database');
const { getDb } = require('./config/mongodb');
const { correlationId } = require('./middleware/correlationId');
const { errorHandler } = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const scholarshipRoutes = require('./routes/scholarships');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');

const app = express();

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: [config.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id'],
}));

// Correlation ID
app.use(correlationId);

// Request Logging
morgan.token('correlationId', (req) => req.correlationId);
app.use(morgan(':method :url :status :res[content-length] - :response-time ms [CID::correlationId]', {
  stream: {
    write: (message) => logger.http(message.trim()),
  },
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads serving (for previewing uploaded documents if authorized or local)
app.use('/uploads', express.static(path.join(__dirname, '..', config.upload.dir)));

// Rate Limiting for Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// API Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/student', studentRoutes);
app.use('/api/v1/scholarships', scholarshipRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/admin', adminRoutes);

// Health Check Endpoint
app.get('/api/v1/health', async (_req, res) => {
  let pgStatus = 'disconnected';
  let mongoStatus = 'disconnected';

  try {
    const pgRes = await pool.query('SELECT NOW()');
    if (pgRes.rows.length > 0) pgStatus = 'connected';
  } catch (err) {
    pgStatus = `error: ${err.message}`;
  }

  try {
    const mongoDb = getDb();
    await mongoDb.command({ ping: 1 });
    mongoStatus = 'connected';
  } catch (err) {
    mongoStatus = `error: ${err.message}`;
  }

  const isHealthy = pgStatus === 'connected' && mongoStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: {
      postgres: pgStatus,
      mongodb: mongoStatus,
    },
    uptime: process.uptime(),
  });
});

// Root API Welcome
app.get('/api/v1', (_req, res) => {
  res.json({
    message: 'Online Scholarship Portal API v1',
    status: 'online',
    endpoints: {
      auth: '/api/v1/auth',
      student: '/api/v1/student',
      scholarships: '/api/v1/scholarships',
      applications: '/api/v1/applications',
      admin: '/api/v1/admin',
      health: '/api/v1/health',
    },
  });
});

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;

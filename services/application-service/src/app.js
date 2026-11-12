const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const config = require('./config');
const applicationRoutes = require('./routes/applicationRoutes');
const ApplicationController = require('./controllers/applicationController');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Security & Parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Static directory for uploaded documents
const uploadDir = path.resolve(process.cwd(), config.upload.dir);
app.use('/uploads', express.static(uploadDir));

// Root Health check
app.get('/health', ApplicationController.getHealth);
app.get('/api/v1/health', ApplicationController.getHealth);

// Mount Application Routes under /api/v1/applications and /applications
app.use('/api/v1/applications', applicationRoutes);
app.use('/applications', applicationRoutes);

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Centralized Error Middleware
app.use(errorHandler);

module.exports = app;


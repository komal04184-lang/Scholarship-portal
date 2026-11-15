import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import reviewRoutes from './routes/reviewRoutes.js';
import errorHandler from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Correlation ID middleware
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || `rv-${Date.now()}`;
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

// Health routes
app.get('/', (req, res) => res.json({
  service: 'Scholarship Review Service',
  status: 'running',
  port: process.env.PORT || 3004,
  docs: 'GET /api-docs for Swagger UI, GET /api/health for health check',
}));

app.get('/health', (req, res) => res.json({
  success: true,
  service: 'review-service',
  status: 'healthy',
  database: 'review_db',
}));

app.get('/api/health', (req, res) => res.json({
  success: true,
  service: 'review-service',
  status: 'healthy',
  database: 'review_db',
}));

// Swagger UI (optional, graceful fallback)
try {
  const swaggerUi = require('swagger-ui-express');
  const yaml = require('js-yaml');
  const swaggerPath = join(__dirname, '../docs/openapi.yaml');
  if (existsSync(swaggerPath)) {
    const swaggerDoc = yaml.load(readFileSync(swaggerPath, 'utf8'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
    console.log('Swagger UI: /api-docs');
  }
} catch (e) {
  console.warn('Swagger UI not available:', e.message);
}

// Review routes — support both /api/reviews and /api/v1/reviews
app.use('/api/reviews', reviewRoutes);
app.use('/api/v1/reviews', reviewRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use(errorHandler);

export default app;

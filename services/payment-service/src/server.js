require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./config/db');
const paymentRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Distributed Tracing Correlation ID logger
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || `pay-${Date.now()}`;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'payment-service', port: Number(PORT) });
});

app.use('/api/v1/payments', paymentRoutes);

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Payment Service running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize Payment Service database:', err);
    process.exit(1);
  });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const studentRoutes = require('./routes/studentRoutes');
const scholarshipRoutes = require('./routes/scholarshipRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const documentRoutes = require('./routes/documentRoutes');
const adminRoutes = require('./routes/adminRoutes');

const StudentController = require('./controllers/studentController');
const AdminController = require('./controllers/adminController');
const { authenticate } = require('./middleware/authMiddleware');
const errorMiddleware = require('./middleware/errorMiddleware');
const { setupSoapServer } = require('./soap/soapServer');
const { pool } = require('./config/db');

const app = express();

// Security & Parsing
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static folder for uploaded documents
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    res.json({
      status: 'healthy',
      database: 'connected',
      db_time: dbRes.rows[0].now,
      uptime: process.uptime(),
    });
  } catch (err) {
    res.status(500).json({ status: 'unhealthy', error: err.message });
  }
});

// Auth Routes Router (supporting both /api/v1/auth and /api/auth)
const authRouter = express.Router();
authRouter.post('/register', StudentController.register);
authRouter.post('/login', StudentController.login);
authRouter.post('/admin/login', AdminController.login);
authRouter.get('/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// Mount Routes with /api/v1 prefix and /api prefix for maximum compatibility
const apiPrefixes = ['/api/v1', '/api'];
apiPrefixes.forEach((prefix) => {
  app.use(`${prefix}/auth`, authRouter);
  app.use(`${prefix}/student`, studentRoutes);
  app.use(`${prefix}/scholarships`, scholarshipRoutes);
  app.use(`${prefix}/applications`, applicationRoutes);
  app.use(`${prefix}/documents`, documentRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
});

// Setup SOAP Web Service
setupSoapServer(app);

// Error Middleware
app.use(errorMiddleware);

module.exports = app;

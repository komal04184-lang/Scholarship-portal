require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  pg: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT, 10) || 5432,
    database: process.env.PGDATABASE || 'scholarship_portal',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
  },

  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DATABASE || 'scholarship_documents',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_dev_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024,
    dir: process.env.UPLOAD_DIR || 'uploads',
  },
};

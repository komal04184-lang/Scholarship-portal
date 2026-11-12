require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3002,
  nodeEnv: process.env.NODE_ENV || 'development',

  pg: {
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT, 10) || 5432,
    database: process.env.PGDATABASE || 'scholarship_portal',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'Kom@l007',
    schema: process.env.PG_SCHEMA || 'public',
  },

  mongo: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.MONGODB_DATABASE || 'scholarship_documents',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_k9x2m4p7',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  services: {
    studentServiceUrl: process.env.STUDENT_SERVICE_URL || 'http://localhost:3000',
    scholarshipServiceUrl: process.env.SCHOLARSHIP_SERVICE_URL || 'http://localhost:3000',
    authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3000',
    fallbackEligibilityCheck: process.env.FALLBACK_ELIGIBILITY_CHECK === 'true' || true,
    requestTimeoutMs: parseInt(process.env.SERVICE_TIMEOUT_MS, 10) || 4000,
  },

  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ],
  },
};


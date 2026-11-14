require('dotenv').config();
const path = require('path');

const env = {
  port: parseInt(process.env.PORT, 10) || 3003,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',

  postgres: {
    connectionString: process.env.DATABASE_URL || null,
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    port: parseInt(process.env.DB_PORT || process.env.PGPORT, 10) || 5432,
    database: process.env.DB_NAME || process.env.PGDATABASE || 'application_db',
    user: process.env.DB_USER || process.env.PGUSER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'Kom@l007',
    schema: process.env.PG_SCHEMA || 'public',
    max: parseInt(process.env.PG_POOL_MAX, 10) || 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },

  services: {
    identityServiceUrl: process.env.IDENTITY_SERVICE_URL || process.env.STUDENT_SERVICE_URL || 'http://localhost:3001',
    scholarshipServiceUrl: process.env.SCHOLARSHIP_SERVICE_URL || 'http://localhost:3000',
    reviewServiceUrl: process.env.REVIEW_SERVICE_URL || 'http://localhost:3004',
    paymentServiceUrl: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
    serviceToServiceSecret: process.env.SERVICE_TO_SERVICE_SECRET || 'internal_super_secret_token_change_in_prod',
    fallbackEligibilityCheck: process.env.FALLBACK_ELIGIBILITY_CHECK !== 'false',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_k9x2m4p7',
    publicKey: process.env.JWT_PUBLIC_KEY || null,
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  upload: {
    dir: path.resolve(process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads')),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    allowedMimes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ],
    allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
  },
};

module.exports = env;

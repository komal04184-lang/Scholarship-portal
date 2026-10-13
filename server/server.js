require('dotenv').config();
const http = require('http');
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test PostgreSQL database connection
    const testRes = await pool.query('SELECT current_database(), current_user, version()');
    console.log('====================================================');
    console.log(' SCHOLARSHIP PORTAL BACKEND SERVICE STARTING');
    console.log('====================================================');
    console.log(`✓ Connected to PostgreSQL Database: ${testRes.rows[0].current_database}`);
    console.log(`✓ Database User: ${testRes.rows[0].current_user}`);

    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`✓ REST API Server listening on port: ${PORT}`);
      console.log(`✓ API Base: http://localhost:${PORT}/api/v1`);
      console.log(`✓ SOAP Endpoint: http://localhost:${PORT}/soap`);
      console.log(`✓ SOAP WSDL: http://localhost:${PORT}/wsdl`);
      console.log('====================================================');
    });

    const gracefulShutdown = () => {
      console.log('Shutting down server gracefully...');
      server.close(() => {
        pool.end(() => {
          console.log('PostgreSQL connection pool closed.');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

import 'dotenv/config';
import app from './app.js';
import { initializeDatabase, closeDatabase } from './config/database.js';


const PORT = Number(process.env.PORT || 3004);
try {
  await initializeDatabase();
  const server = app.listen(PORT, () => console.log(`Review Service running at http://localhost:${PORT}`));
  // Retry saved final decisions if Application Service was unavailable during the original callback.

  const shutdown = async() => {

    server.close(async() => { await closeDatabase(); process.exit(0); });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('Failed to start Review Service:', error.message);
  process.exit(1);
}

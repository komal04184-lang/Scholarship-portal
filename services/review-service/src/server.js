import 'dotenv/config';
import app from './app.js';
import { initializeDatabase, closeDatabase } from './config/database.js';


const PORT = Number(process.env.PORT || 3004);
try {
  await initializeDatabase();
  const server = app.listen(PORT, () => console.log(`Review Service running at http://localhost:${PORT}`));
  let retryTimer = null;
  // Retry saved final decisions if Application Service was unavailable during the original callback.
  import('./services/reviewService.js').then(({ retryPendingCallbacks }) => {
    const runRetry = () => {
      retryPendingCallbacks()
        .then((n) => {
          if (n > 0) console.log(`[Review Service] Retried ${n} pending status callbacks to Application Service`);
        })
        .catch((err) => console.warn('[Review Service] Callback retry error:', err.message));
    };

    // Run once at startup
    runRetry();
    // Safely schedule recurring retries every 60 seconds
    retryTimer = setInterval(runRetry, 60000);
    if (retryTimer.unref) retryTimer.unref();
  });

  const shutdown = async() => {
    if (retryTimer) clearInterval(retryTimer);
    server.close(async() => { await closeDatabase(); process.exit(0); });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  console.error('Failed to start Review Service:', error.message);
  process.exit(1);
}

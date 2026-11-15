const requestCounts = new Map();

function createLocalRateLimiter(windowMs = 60000, max = 30, message = 'Too many requests. Please try again later.') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requestCounts.entries()) {
      if (now > data.resetTime) {
        requestCounts.delete(key);
      }
    }
  }, Math.max(windowMs, 30000)).unref();

  return (req, res, next) => {
    const key = `${req.ip}_${req.baseUrl || req.path}`;
    const now = Date.now();

    let entry = requestCounts.get(key);
    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      requestCounts.set(key, entry);
    } else {
      entry.count++;
    }

    res.setHeader('X-LocalRateLimit-Limit', max);
    res.setHeader('X-LocalRateLimit-Remaining', Math.max(0, max - entry.count));
    res.setHeader('X-LocalRateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (entry.count > max) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'LOCAL_RATE_LIMIT_EXCEEDED',
          message,
        },
        retryAfterSeconds: Math.ceil((entry.resetTime - now) / 1000),
      });
    }

    next();
  };
}

module.exports = createLocalRateLimiter;

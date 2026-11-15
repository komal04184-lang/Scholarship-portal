'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { rateLimit } = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { v4: uuidv4 } = require('uuid');
const http = require('http');

// ─── Production Secret Assertion Guard (SEC-07) ─────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const weakSecrets = [
    'dev_jwt_secret_change_in_production_k9x2m4p7',
    'internal_super_secret_token_change_in_prod',
    'secret',
    'change_in_production',
  ];

  if (!process.env.JWT_SECRET || weakSecrets.includes(process.env.JWT_SECRET)) {
    console.error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is either unset or using a known insecure development fallback in production mode.');
    process.exit(1);
  }
}

const app = express();

// ─── Environment ─────────────────────────────────────────────────────────────
const IDENTITY_SERVICE_URL    = process.env.IDENTITY_SERVICE_URL    || 'http://localhost:3001';
const SCHOLARSHIP_SERVICE_URL = process.env.SCHOLARSHIP_SERVICE_URL || 'http://localhost:3002';
const APPLICATION_SERVICE_URL = process.env.APPLICATION_SERVICE_URL || 'http://localhost:3003';
const REVIEW_SERVICE_URL      = process.env.REVIEW_SERVICE_URL      || 'http://localhost:3004';
const CORS_ORIGIN             = process.env.CORS_ORIGIN             || 'http://localhost:5173';

const RATE_LIMIT_WINDOW_MS  = parseInt(process.env.RATE_LIMIT_WINDOW_MS  || '900000', 10);
const RATE_LIMIT_MAX        = parseInt(process.env.RATE_LIMIT_MAX        || '100',    10);
const AUTH_RATE_LIMIT_MAX   = parseInt(process.env.AUTH_RATE_LIMIT_MAX   || '15',     10);

// ─── Security & Parsing ──────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('combined'));

// ─── Correlation ID Middleware ───────────────────────────────────────────────
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

// ─── Rate Limiters ───────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      type: 'https://apexscholar.local/errors/rate-limit-exceeded',
      title: 'Rate Limit Exceeded',
      status: 429,
      detail: 'Too many requests. Please retry after window expiration.',
      code: 'RATE_LIMIT_EXCEEDED',
      correlationId: req.correlationId,
    });
  },
  skip: (req) => req.path === '/' || req.path === '/health' || req.path === '/api/v1/health',
  keyGenerator: (req) => req.ip,
});

app.use((req, res, next) => {
  generalLimiter(req, res, (err) => {
    if (err) return next(err);
    if (req.rateLimit) {
      res.setHeader('X-RateLimit-Limit',     req.rateLimit.limit);
      res.setHeader('X-RateLimit-Remaining', req.rateLimit.remaining);
      res.setHeader('X-RateLimit-Reset',     Math.ceil(req.rateLimit.resetTime / 1000));
    }
    next();
  });
});

const authLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: false,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      type: 'https://apexscholar.local/errors/auth-rate-limit-exceeded',
      title: 'Authentication Rate Limit Exceeded',
      status: 429,
      detail: 'Too many authentication attempts. Please retry later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      correlationId: req.correlationId,
    });
  },
});

app.use('/api/v1/auth', authLimiter);

// ─── Health Probing Utility ──────────────────────────────────────────────────
function probeService(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    let resolved = false;
    let timer = null;

    const safeResolve = (result) => {
      if (resolved) return;
      resolved = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };

    try {
      const u = new URL(url);
      const req = http.get(u, { timeout: timeoutMs }, (res) => {
        let raw = '';
        res.on('data', (c) => { raw += c; });
        res.on('end', () => {
          let data = null;
          try { data = JSON.parse(raw); } catch (_) {}
          safeResolve({
            status: res.statusCode >= 200 && res.statusCode < 300 ? 'healthy' : 'degraded',
            httpStatus: res.statusCode,
            data,
          });
        });
      });

      // Guard timer to guarantee resolution and socket termination even if DNS or connect hangs
      timer = setTimeout(() => {
        try { req.destroy(new Error('Hard probe timeout')); } catch (_) {}
        safeResolve({ status: 'timeout', httpStatus: 504 });
      }, timeoutMs + 200);

      req.on('timeout', () => {
        try { req.destroy(); } catch (_) {}
        safeResolve({ status: 'timeout', httpStatus: 504 });
      });

      req.on('error', (err) => {
        safeResolve({ status: 'unreachable', error: err.message });
      });
    } catch (e) {
      safeResolve({ status: 'error', error: e.message });
    }
  });
}

// ─── Health & Welcome Routes ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ApexScholar — Microservices API Gateway</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0F172A; color: #F8FAFC; margin: 0; padding: 2rem; }
    .card { background: #1E293B; border-radius: 12px; padding: 1.5rem; margin-bottom: 1rem; border: 1px solid #334155; }
    h1 { color: #38BDF8; margin-top: 0; }
    h2 { color: #818CF8; font-size: 1.1rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
    a { color: #38BDF8; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    .badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700; background: #065F46; color: #34D399; margin-left: 0.5rem; }
    ul { list-style: none; padding-left: 0; }
    li { padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .port { color: #94A3B8; font-family: monospace; }
  </style>
</head>
<body>
  <div style="max-width: 800px; margin: 0 auto;">
    <h1>🎓 ApexScholar API Gateway <span class="badge">ONLINE (Port 3000)</span></h1>
    <p style="color: #94A3B8;">Central API router, rate limiter, and distributed tracing ingress for ApexScholar Microservices.</p>

    <div class="card">
      <h2>🌐 User Interfaces & Gateways</h2>
      <ul>
        <li>👉 <a href="http://localhost:5173" target="_blank">React + Vite Frontend Application</a> <span class="port">:5173</span></li>
        <li>🔍 <a href="/health">Gateway System Health & Route Manifest</a> <span class="port">:3000/health</span></li>
      </ul>
    </div>

    <div class="card">
      <h2>📚 Interactive Swagger UI Explorers</h2>
      <ul>
        <li>📑 <a href="http://localhost:3001/api-docs" target="_blank">Identity & Student Service Swagger UI</a> <span class="port">:3001/api-docs</span></li>
        <li>📑 <a href="http://localhost:3002/api-docs" target="_blank">Scholarship Service Swagger UI</a> <span class="port">:3002/api-docs</span></li>
        <li>📑 <a href="http://localhost:3003/api-docs" target="_blank">Application Service Swagger UI</a> <span class="port">:3003/api-docs</span></li>
        <li>📑 <a href="http://localhost:3004/api-docs" target="_blank">Review Service Swagger UI</a> <span class="port">:3004/api-docs</span></li>
      </ul>
    </div>

    <div class="card">
      <h2>⚡ Web Services Protocol Endpoints</h2>
      <ul>
        <li>🔮 <a href="http://localhost:3002/graphql" target="_blank">GraphQL Playground / Endpoint</a> <span class="port">:3002/graphql</span></li>
        <li>📜 <a href="http://localhost:3002/soap/wsdl" target="_blank">SOAP Eligibility WSDL Definition</a> <span class="port">:3002/soap/wsdl</span></li>
      </ul>
    </div>
  </div>
</body>
</html>`);
});

const healthHandler = async (req, res) => {
  const [identityRes, scholarshipRes, applicationRes, reviewRes] = await Promise.all([
    probeService(`${IDENTITY_SERVICE_URL}/health`),
    probeService(`${SCHOLARSHIP_SERVICE_URL}/health`),
    probeService(`${APPLICATION_SERVICE_URL}/health`),
    probeService(`${REVIEW_SERVICE_URL}/health`),
  ]);

  const allHealthy = [identityRes, scholarshipRes, applicationRes, reviewRes].every(
    (s) => s.status === 'healthy'
  );

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    status: allHealthy ? 'healthy' : 'degraded',
    service: 'api-gateway',
    version: '1.0.0',
    correlationId: req.correlationId,
    timestamp: new Date().toISOString(),
    services: {
      identity: { url: IDENTITY_SERVICE_URL, ...identityRes },
      scholarship: { url: SCHOLARSHIP_SERVICE_URL, ...scholarshipRes },
      application: { url: APPLICATION_SERVICE_URL, ...applicationRes },
      review: { url: REVIEW_SERVICE_URL, ...reviewRes },
    },
  });
};

app.get('/health',        healthHandler);
app.get('/api/v1/health', healthHandler);

// ─── Proxy Factory ───────────────────────────────────────────────────────────
function makeProxy(target, pathFilter, options = {}) {
  return createProxyMiddleware({
    target,
    pathFilter,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        if (req.correlationId) {
          proxyReq.setHeader('X-Correlation-ID', req.correlationId);
        }
      },
    },
    ...options,
  });
}

// ─── Proxy Routes ────────────────────────────────────────────────────────────

// 1. Identity Student Service
app.use(makeProxy(IDENTITY_SERVICE_URL, [
  '/api/v1/auth',
  '/api/v1/profile',
  '/api/v1/students',
  '/api/v1/admin/users',
]));

// 2. Scholarship Service (Single registration with admin rewrite)
app.use(makeProxy(SCHOLARSHIP_SERVICE_URL, [
  '/api/v1/scholarships',
  '/api/v1/admin/scholarships',
  '/graphql',
  '/soap',
], {
  pathRewrite: {
    '^/api/v1/admin/scholarships': '/api/v1/scholarships/admin',
  },
}));

// 3. Application Service
app.use(makeProxy(APPLICATION_SERVICE_URL, [
  '/api/v1/applications',
  '/api/v1/documents',
  '/api/v1/admin/applications',
]));

// 4. Review Service (re-writing /api/v1/reviews to /api/reviews)
app.use(makeProxy(REVIEW_SERVICE_URL, [
  '/api/reviews',
  '/api/v1/reviews',
], {
  pathRewrite: { '^/api/v1/reviews': '/api/reviews' },
}));

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    type: 'https://apexscholar.local/errors/not-found',
    title: 'Resource Not Found',
    status: 404,
    detail: `Route not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
    correlationId: req.correlationId,
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[api-gateway] Unhandled error:', err);
  res.status(err.status || 500).json({
    type: 'https://apexscholar.local/errors/gateway-error',
    title: 'Gateway Error',
    status: err.status || 500,
    detail: err.message || 'Internal gateway error occurred',
    code: 'GATEWAY_ERROR',
    correlationId: req.correlationId,
  });
});

module.exports = app;

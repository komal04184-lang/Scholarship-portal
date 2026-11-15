# API Gateway — ApexScholar

The **API Gateway** is the single entry point for all client traffic in the ApexScholar platform. It runs on **port 3000** and reverse-proxies requests to the four downstream microservices.

## Architecture

```
Client (React @ :5173)
        │
        ▼
  API Gateway (:3000)
  ┌──────────────────────────────────────────────────────┐
  │  helmet · cors · morgan · rate-limit · correlationId │
  └───┬──────────┬───────────┬──────────┬───────────────┘
      │          │           │          │
 Identity   Scholarship  Application  Review
  (:3001)    (:3002)      (:3003)    (:3004)
```

## Route Map

| Gateway path | Upstream service | Notes |
|---|---|---|
| `GET /health` | gateway | health check |
| `GET /api/v1/health` | gateway | alias |
| `/api/v1/auth/**` | Identity | strict rate limit (10/15 min) |
| `/api/v1/profile/**` | Identity | |
| `/api/v1/students/**` | Identity | |
| `/api/v1/admin/users/**` | Identity | admin user management |
| `/api/v1/scholarships/**` | Scholarship | |
| `/api/v1/admin/scholarships/**` | Scholarship | admin routes |
| `/api/v1/applications/**` | Application | |
| `/api/v1/documents/**` | Application | |
| `/api/v1/admin/applications/**` | Application | admin routes |
| `/api/v1/reviews/**` | Review | rewritten to `/api/reviews` upstream |
| `/api/reviews/**` | Review | |
| `/graphql` | Scholarship | GraphQL endpoint |
| `/soap` | Scholarship | SOAP endpoint |

## Middleware Stack

| Middleware | Purpose |
|---|---|
| `helmet` | Secure HTTP headers |
| `cors` | Allow `http://localhost:5173` |
| `express.json()` | Parse JSON bodies |
| `morgan` (combined) | HTTP access logs |
| Correlation ID | Adds `X-Correlation-ID` UUID header to every request & response |
| General rate limiter | 100 req / 15 min — exposes `X-RateLimit-{Limit,Remaining,Reset}` |
| Auth rate limiter | 10 req / 15 min on `/api/v1/auth` |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the gateway listens on |
| `NODE_ENV` | `development` | Runtime environment |
| `IDENTITY_SERVICE_URL` | `http://localhost:3001` | Identity service base URL |
| `SCHOLARSHIP_SERVICE_URL` | `http://localhost:3002` | Scholarship service base URL |
| `APPLICATION_SERVICE_URL` | `http://localhost:3003` | Application service base URL |
| `REVIEW_SERVICE_URL` | `http://localhost:3004` | Review service base URL |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window (ms) |
| `RATE_LIMIT_MAX` | `100` | General rate limit max requests |
| `AUTH_RATE_LIMIT_MAX` | `10` | Auth route rate limit max requests |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed CORS origin |

## Getting Started

```bash
# Install dependencies
cd api-gateway
npm install

# Copy environment file
cp .env.example .env

# Start (production)
npm start

# Start (development with auto-reload)
npm run dev
```

The gateway will be available at `http://localhost:3000`.

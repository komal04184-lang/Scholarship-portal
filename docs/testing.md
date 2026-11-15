# ApexScholar Automated Testing Documentation

## 1. Test Architecture

ApexScholar contains automated test suites across all backend services utilizing Node.js native test runner (`node --test`), `assert`, and `supertest`/`fetch`.

---

## 2. Test Execution Commands

Each service can be tested independently:

```powershell
# 1. API Gateway Tests (Routing, Correlation IDs, Rate Limit Headers)
cd C:\projects\scholarship\api-gateway
npm test

# 2. Scholarship Service Tests (Health, GraphQL, SOAP WSDL & Eligibility, Caching)
cd C:\projects\scholarship\services\scholarship-service
npm test

# 3. Review Service Tests (Eligibility Scrutiny, Document Verification, Callback Sync)
cd C:\projects\scholarship\services\review-service
npm test

# 4. Identity Service Tests (Auth, Profile, RBAC, Password Reset)
cd C:\projects\scholarship\services\identity_student_service\backend
node tests/run_tests.js

# 5. Frontend Build Verification (React + Vite)
cd C:\projects\scholarship\client
npm run build
```

---

## 3. Test Coverage Summary

- **API Gateway (`api-gateway/tests/gateway.test.js`)**:
  - `GET /health`: Verifies gateway proxy route manifest.
  - `X-Correlation-ID`: Verifies header generation and injection.
  - `X-RateLimit-*`: Verifies rate limiting headers on responses.
- **Scholarship Service (`scholarship-service/tests/scholarship.test.js`)**:
  - `GET /health`: Verifies health check payload.
  - `GET /soap/wsdl`: Verifies WSDL XML structure.
  - `POST /soap/eligibility`: Verifies SOAP envelope processing and XML response generation.
  - `POST /graphql`: Verifies GraphQL execution.
- **Review Service (`review-service/tests/reviewService.test.js`)**:
  - Verification workflow enforcement (cannot approve before verification).
  - Preserving document verification records.
  - Duplicate review prevention.
  - Callback status synchronization.
- **Frontend Client (`client`)**:
  - Full Vite build compiles 1,920 modules with zero errors.

# ApexScholar - 28 Academic Requirements Verification

This document provides evidence and implementation references for all 28 requirements of the academic Web Services curriculum.

| # | Requirement | Implementation Evidence | Status |
| :---: | :--- | :--- | :---: |
| **1** | **Microservice Architecture** | 4 independent backend services (`identity_student_service`, `scholarship-service`, `application-service`, `review-service`) + `api-gateway`. | ✅ Complete |
| **2** | **API Gateway** | Express-based reverse proxy on Port 3000 (`api-gateway/src/app.js`), forwards all traffic, mounts rate limiters and logging. | ✅ Complete |
| **3** | **Database-per-Service** | 4 independent PostgreSQL databases (`identity_db`, `scholarship_db`, `application_db`, `review_db`). | ✅ Complete |
| **4** | **MongoDB GridFS Document Store** | `services/application-service/src/services/gridfs.service.js` connects to `mongodb://127.0.0.1:27017/scholarship_documents` using `GridFSBucket`. | ✅ Complete |
| **5** | **HTTP RESTful Hierarchy** | Proper resource naming (`/api/v1/scholarships`, `/api/v1/applications`, `/api/v1/documents`), status codes (200, 201, 304, 400, 401, 403, 404, 409, 429, 500). | ✅ Complete |
| **6** | **Cursor-Based Pagination** | Supported on `GET /api/v1/scholarships?cursor=<id>&limit=10` with `next_cursor` payload. | ✅ Complete |
| **7** | **Content Negotiation (XML & JSON)** | `Accept: application/xml` supported on `GET /api/v1/scholarships` returning valid XML schema. | ✅ Complete |
| **8** | **HTTP Caching & ETag** | `ETag` and `Cache-Control` headers emitted on `/api/v1/scholarships`; `If-None-Match` returns `304 Not Modified`. | ✅ Complete |
| **9** | **Rate Limiting & Headers** | `express-rate-limit` on API Gateway with `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers. | ✅ Complete |
| **10** | **Authentication & RBAC** | JWT Bearer tokens in headers and cookies; strict role checking (`student`, `reviewer`, `admin`). | ✅ Complete |
| **11** | **OpenAPI 3.0 Specifications** | `openapi.yaml` authored for every microservice under each service's `docs/` folder. | ✅ Complete |
| **12** | **Interactive Swagger UI** | Mounted at `/api-docs` on all services (`:3001/api-docs`, `:3002/api-docs`, `:3003/api-docs`, `:3004/api-docs`). | ✅ Complete |
| **13** | **GraphQL Endpoint** | Schema definition and handler on `/graphql` (Scholarship Service, forwarded by Gateway). | ✅ Complete |
| **14** | **SOAP & WSDL Integration** | Contract published at `/soap/wsdl`; SOAP endpoint at `/soap/eligibility` with envelope parser. | ✅ Complete |
| **15** | **Service-to-Service Secret & Tokens** | Shared internal token verification (`INTERNAL_SERVICE_TOKEN`) and JWT propagation. | ✅ Complete |
| **16** | **Structured Logging & Correlation IDs** | `X-Correlation-ID` injected at gateway and logged across all downstream services. | ✅ Complete |
| **17** | **Document Upload Table UI** | `client/src/components/ApplyModal.jsx` table with S.No, Document Type, View, Status, and Action. | ✅ Complete |
| **18** | **Reviewer Dashboard** | `client/src/views/ReviewerDashboard.jsx` allowing scrutiny, document verification, and decision submission. | ✅ Complete |
| **19** | **Student Dashboard** | `client/src/views/StudentDashboard.jsx` tracking applications, stages, and milestones. | ✅ Complete |
| **20** | **Admin Dashboard** | `client/src/views/AdminDashboard.jsx` for scholarship administration and user management. | ✅ Complete |
| **21** | **Input Validation & Sanitization** | Server-side validators across all services (MIME whitelist, CGPA bounds, income limits). | ✅ Complete |
| **22** | **Automated Test Suites** | Node.js test runners across Gateway, Scholarship, Review, and Identity services. | ✅ Complete |
| **23** | **Containerization Files** | `Dockerfile` for all 5 services and `docker-compose.yml` at project root. | ✅ Complete |
| **24** | **Comprehensive Technical Documentation** | Full markdown documentation suite in `docs/` folder. | ✅ Complete |
| **25** | **Zero Monolithic Leftovers** | Old `server/` and `scholarship-portal-backend/` directories completely deleted. | ✅ Complete |
| **26** | **No Hardcoded Secrets** | All database passwords, JWT secrets, and ports loaded strictly via `.env` files. | ✅ Complete |
| **27** | **Standardized Error Handling** | Structured error responses with error codes, human messages, and no leaked stack traces. | ✅ Complete |
| **28** | **Connected Frontend** | React + Vite client configured with proxy to API Gateway (`localhost:3000`), no mock/localStorage substitutes. | ✅ Complete |

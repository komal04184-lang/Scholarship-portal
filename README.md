# ApexScholar — Online Scholarship Management Portal 🎓

ApexScholar is an enterprise-grade university scholarship portal designed for academic institutions to manage, scrutinize, award, and disburse student scholarships with complete transparency.

Built using an asynchronous **Microservices Architecture** with **Database-per-Service (PostgreSQL)**, **MongoDB GridFS** for binary document artifacts with resilient local failover, **API Gateway**, **GraphQL**, **SOAP/WSDL**, and **React + Vite**.

---

## 🏛️ Microservice Architecture & Port Manifest

| Service | Port | Primary Database | Key Interfaces & API Docs |
| :--- | :---: | :--- | :--- |
| **API Gateway** | `3000` | In-Memory (Rate Limiting) | Reverse proxy, distributed tracing (`X-Correlation-ID`), global rate limiting (`/health`) |
| **Identity Service** | `3001` | PostgreSQL (`identity_db`) | `http://localhost:3001/api-docs` (User profiles, authentication, user sessions) |
| **Scholarship Service** | `3002` | PostgreSQL (`scholarship_db`) | `http://localhost:3002/api-docs`<br>• **GraphQL:** `http://localhost:3002/graphql`<br>• **SOAP WSDL:** `http://localhost:3002/soap/wsdl` |
| **Application Service** | `3003` | PostgreSQL (`application_db`) + MongoDB GridFS | `http://localhost:3003/api-docs`<br>• Lifecycle status engine, document uploads, admin metrics |
| **Review Service** | `3004` | PostgreSQL (`review_db`) | `http://localhost:3004/api-docs`<br>• Reviewer assignment, criteria evaluation, automatic callback retry loop |
| **Frontend Client** | `5173` | React + Vite (SPA) | Connected via API Gateway proxy (`:3000`) |

---

## 🌟 Key Capabilities & Protocol Interoperability

### 1. Unified API Gateway (`:3000`)
- **Reverse Proxy:** Directs incoming `/api/v1/auth`, `/api/v1/scholarships`, `/api/v1/applications`, and `/api/reviews` to backend microservices.
- **Correlation ID:** Generates or forwards `X-Correlation-ID` across all services.
- **Rate Limiting:** Enforces 100 requests / 15 minutes generally and 15 requests / 15 minutes on auth endpoints.

### 2. Multi-Protocol Support
- **REST APIs:** Full JSON REST APIs across all 4 services with standardized status codes (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `429`).
- **GraphQL (`:3002/graphql`):** Flexible querying of scholarship programs, criteria, limits, and deadlines.
- **SOAP / WSDL (`:3002/soap/wsdl`):** Formal enterprise web service contract with `POST /soap/eligibility` processing standard XML SOAP envelopes.

### 3. Document Processing with MongoDB GridFS & Resilient Failover
- Uploaded files (PDF, PNG, JPEG) are checked for server-side binary magic-byte signatures.
- Files are saved in **MongoDB GridFS** (`scholarship_documents` database) with relational metadata in PostgreSQL (`application_documents`).
- **Zero-Downtime Fallback:** If MongoDB is offline, documents are stored and streamed safely via local filesystem storage (`uploads/`) with SHA-256 integrity checksums.

### 4. Security & Session Hardening
- **Authentication:** Standard RFC 7519 HMAC-SHA256 tokens and HTTP-only session cookies.
- **Session Management:** Refresh tokens stored as SHA-256 hashes in `user_sessions`. Rotation enforced on every refresh. Replay/reuse of revoked tokens triggers immediate family invalidation.
- **CSRF Defense:** State-changing cookie requests verified against trusted Origin/Referer headers.

---

## 🚀 Running the Project Locally (PowerShell)

### Prerequisites
- Node.js (v18+)
- PostgreSQL (running locally on port `5432` with databases `identity_db`, `scholarship_db`, `application_db`, `review_db`)
- MongoDB (running on port `27017` for GridFS storage)

### Quick Start: All Microservices
From the project root:
```powershell
node start-all.js
```
This concurrently starts:
- API Gateway (`:3000`)
- Identity Service (`:3001`)
- Scholarship Service (`:3002`)
- Application Service (`:3003`)
- Review Service (`:3004`)
- Frontend Client (`:5173`)

---

## 🧪 Testing & Validation

### Run Full Regression Suite
```powershell
# Phase 1 & 2 Core End-to-End Workflow Verification
node scripts/verify_e2e_journey.js

# Phase 2 Authorization & RBAC Tests
node scripts/test_phase2_auth.js

# Phase 3 GridFS & Document Storage Tests
node scripts/test_gridfs.js

# Phase 4 Security Hardening Suite (Magic bytes, Refresh reuse, CSRF, Rate limits)
node scripts/test_security_hardening.js

# Frontend Production Build Check
npm run build --prefix client
```

---

## 📖 Demonstration Runbook
See [`docs/DEMONSTRATION_GUIDE.md`](./docs/DEMONSTRATION_GUIDE.md) for full cURL and PowerShell command examples covering the entire student and reviewer workflow.

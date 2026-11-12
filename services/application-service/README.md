# ApexScholar — Application Microservice

[![Service](https://img.shields.io/badge/microservice-application--service-blue.svg)](.)
[![Port](https://img.shields.io/badge/port-3003-green.svg)](.)
[![Tests](https://img.shields.io/badge/tests-36%20passed-brightgreen.svg)](.)
[![Runtime](https://img.shields.io/badge/runtime-Node.js%20%7C%20Windows-success.svg)](.)

The **Application Microservice** is an independent, autonomous microservice responsible for the end-to-end scholarship application lifecycle within the **ApexScholar Online Scholarship Portal** microservices ecosystem. It runs natively using Node.js and Express directly on Windows without Docker or container dependencies.

---

## 1. System Context & Topology

In the target ApexScholar microservices architecture, services communicate over HTTP/REST using bounded contexts and private data ownership:

```
                          +-------------------------------+
                          |    React Frontend (5173)      |
                          +---------------+---------------+
                                          |
                                          v
                          +---------------+---------------+
                          |    API Gateway (Port 3000)    |
                          +---------------+---------------+
                                          |
           +------------------------------+------------------------------+
           |                              |                              |
           v                              v                              v
+-----------------------+     +-----------------------+     +-------------------------+
| Auth & Student        |     | Scholarship Service   |     | Application Service     |
| Identity Service      |     | (Port 3002)           |     | (Port 3003)             |
| (Port 3001)           |     +-----------------------+     +------------+------------+
+-----------------------+                 ^                              |
           ^                              |                              |
           +------------------------------+------------------------------+
                                          | HTTP Clients
                                          v
                              +-----------------------+
                              | Review Service (3004) |
                              +-----------------------+
                                          |
                                          v
                              +-----------------------+
                              | Payment Service (3005)|
                              +-----------------------+
```

### Microservice Ownership Matrix
| Microservice | Port | Database | Domain Responsibilities |
|---|---|---|---|
| **API Gateway** | `3000` | None | Client entry point, routing, reverse proxy |
| **Auth & Student Identity Service** | `3001` | MongoDB (`users`) | Registration, login, student profile, JWT issuance, roles |
| **Scholarship Service** | `3002` | PostgreSQL (`scholarship`) | Scholarship catalog, eligibility criteria, application deadlines |
| **Application Service** | **`3003`** | **PostgreSQL + MongoDB** | **Applications, status transitions, audit history, documents, tracking, idempotency** |
| **Review Service** | `3004` | MongoDB / PostgreSQL | Reviewer assignment, scrutiny, reviewer comments, verification decisions |
| **Payment Service** | `3005` | PostgreSQL (`payments`) | Payment vouchers, bank transfers, disbursement status |

---

## 2. Directory Structure

The service is strictly organized following Clean / Layered Architecture:

```text
services/application-service/
├── src/
│   ├── config/
│   │   ├── database.js               # PostgreSQL pool & MongoDB client connections
│   │   └── env.js                    # Centralized environment variable loader & defaults
│   │
│   ├── routes/
│   │   ├── application.routes.js     # Student & Admin application endpoints
│   │   ├── document.routes.js        # File upload, list, download, verify endpoints
│   │   └── internal.routes.js        # Service-to-service protected endpoints
│   │
│   ├── controllers/
│   │   ├── application.controller.js # Application HTTP handlers & response formatting
│   │   ├── document.controller.js    # Document upload, streaming & verification handlers
│   │   └── internal.controller.js   # Internal service call handlers
│   │
│   ├── services/
│   │   ├── application.service.js    # Core application orchestration, submission & updates
│   │   ├── eligibility.service.js    # Scholarship validation & eligibility rule checks
│   │   ├── document.service.js       # Secure file storage, path traversal guards & streaming
│   │   └── status.service.js         # Formal state machine, tracking & progress calculation
│   │
│   ├── repositories/
│   │   ├── application.repository.js # PostgreSQL application & idempotency queries + Mongo snapshots
│   │   ├── document.repository.js    # PostgreSQL document metadata DAO + Mongo metadata
│   │   └── status.repository.js      # PostgreSQL append-only status audit DAO
│   │
│   ├── middleware/
│   │   ├── authenticate.js           # JWT authentication (Cookie + Bearer header support)
│   │   ├── authorize.js              # Role-based access control (Student, Admin, Reviewer)
│   │   ├── error-handler.js          # Centralized RFC-compliant error handling
│   │   └── validate-request.js       # Joi request schema validation
│   │
│   ├── clients/
│   │   ├── identity.client.js        # HTTP client for Auth & Student Identity Service (Port 3001)
│   │   ├── scholarship.client.js     # HTTP client for Scholarship Service (Port 3002)
│   │   └── review.client.js          # HTTP client for Review Service (Port 3004)
│   │
│   ├── validators/
│   │   ├── application.validator.js  # Joi schemas for submission, update, status change
│   │   └── document.validator.js     # Joi schemas for upload and document verification
│   │
│   ├── utils/
│   │   ├── api-response.js           # Consistent success/error response envelope
│   │   ├── application-id.js         # Human-readable application number generator (APP-2026-XXXXX)
│   │   └── logger.js                 # Structured JSON logger
│   │
│   ├── app.js                        # Express application configuration & middleware stack
│   └── server.js                     # HTTP server startup & graceful shutdown lifecycle
│
├── migrations/
│   ├── 001_create_application_service_schema.sql  # Base PostgreSQL schema
│   ├── 002_application_service_enhancements.sql   # Idempotency, application numbers, status constraints
│   └── run_migrations.js             # Automated migration runner
├── seeds/
│   └── seed.js                       # Reference / development seed script
├── tests/
│   ├── unit/
│   │   ├── application-id.test.js    # Application number generator unit tests
│   │   └── status.service.test.js    # State machine transition rules unit tests
│   ├── integration/
│   │   └── application.routes.test.js# Complete endpoint integration tests
│   └── e2e/
│       └── lifecycle.e2e.test.js     # End-to-end full application lifecycle tests
│
├── docs/
│   ├── API-CONTRACT.md               # Complete REST API specification
│   ├── openapi.yaml                  # OpenAPI 3.0 specification
│   ├── DATABASE-DESIGN.md            # PostgreSQL & MongoDB schema documentation
│   └── SERVICE-COMMUNICATION.md      # Microservice interaction protocols & resilience
│
├── uploads/
│   └── .gitkeep                      # Private storage directory for uploaded documents
├── .env.example                      # Environment configuration template
├── package.json                      # Dependencies and scripts
└── README.md                         # Service documentation
```

---

## 3. Database Architecture & Ownership

The Application Microservice uses a **Hybrid Dual-Store Architecture**:

### PostgreSQL (`scholarship_portal` database)
Primary system of record for transactional data:
- **`application`**: Application ID, human-readable `application_number` (`APP-2026-00019`), `student_id`, `scholarship_id`, `status`, `statement`/`sop`, timestamps.
- **`application_status`**: Append-only status change audit log (`status_id`, `application_id`, `previous_status`, `new_status`, `changed_by`, `changed_by_role`, `remarks`, `changed_at`).
- **`application_document`**: Document attachment metadata (`application_document_id`, `application_id`, `document_name`, `original_name`, `document_path`, `mime_type`, `file_size`, `verification_status`).
- **`application_idempotency`**: Request deduping table (`idempotency_key`, `student_id`, `request_hash`, `response_status`, `response_body`, `expires_at`).

### MongoDB (`scholarship_documents` database)
Flexible point-in-time snapshot store:
- **`application_snapshots`**: Stores an immutable snapshot of the application payload, student details, and scholarship criteria at submission time.
- **`document_metadata`**: Stores file checksums, upload events, and OCR/verification metadata.

---

## 4. Application State Machine

The service strictly validates status transitions:

```
               +-------------+
               |    DRAFT    |
               +------+------+
                      |
                      v
             +-----------------+
             |    SUBMITTED    | <-----------------+
             +---+---------+---+                   |
                 |         |                       |
                 |         v                       |
                 |  +--------------+               |
                 |  | UNDER_REVIEW |               |
                 |  +---+------+---+               |
                 |      |      |                   |
                 |      |      v                   |
                 |      |  +---------------------+ |
                 |      |  | DOCUMENTS_REQUIRED  | |
                 |      |  | RESUBMISSION_REQ    +-+
                 |      |  | CORRECTION_REQUIRED |
                 |      |  +---------------------+
                 v      v
           +----------+ +-----------+
           | REJECTED | | APPROVED  |
           +----------+ +-----+-----+
                              |
                              v
                        +-----------+
                        | DISBURSED |
                        +-----+-----+
                              |
                              v
                        +-----------+
                        | COMPLETED |
                        +-----------+
```

| Current Status | Allowed Target Statuses | Permitted Roles | Progress % |
|---|---|---|---|
| `DRAFT` | `SUBMITTED`, `WITHDRAWN` | Student | 10% |
| `SUBMITTED` | `UNDER_REVIEW`, `DOCUMENTS_REQUIRED`, `REJECTED`, `WITHDRAWN` | Reviewer, Admin | 25% |
| `UNDER_REVIEW` | `APPROVED`, `REJECTED`, `DOCUMENTS_REQUIRED`, `CORRECTION_REQUIRED`, `WITHDRAWN` | Reviewer, Admin | 50% |
| `DOCUMENTS_REQUIRED` | `UNDER_REVIEW`, `REJECTED`, `WITHDRAWN` | Reviewer, Admin, Student (on upload) | 40% |
| `CORRECTION_REQUIRED`| `UNDER_REVIEW`, `REJECTED`, `WITHDRAWN` | Reviewer, Admin, Student (on edit) | 40% |
| `APPROVED` | `PAYMENT_PENDING`, `DISBURSED`, `COMPLETED` | Admin, Payment Service | 90% |
| `DISBURSED` | `COMPLETED` | Payment Service | 100% |
| `REJECTED` | *Terminal State* | — | 100% |
| `WITHDRAWN` | *Terminal State* | Student | 100% |

---

## 5. Security & Access Control

1. **Authentication:**
   - Supports both `Authorization: Bearer <token>` and HTTP-only cookie `token` issued by the Auth & Student Identity Service.
   - Normalizes roles case-insensitively (`student`, `admin`, `reviewer`).
2. **Student Ownership Isolation:**
   - Every read and write to an application verifies that `application.student_id === req.user.id`.
   - Any attempt by Student A to view, track, edit, or upload documents to Student B's application returns `403 Forbidden`.
   - Administrators and Reviewers are granted authorized cross-student access.
3. **Internal Service-to-Service Security:**
   - Internal endpoints under `/internal/*` require `X-Service-Token: <SERVICE_TO_SERVICE_SECRET>`.
4. **Secure Document Storage:**
   - Upload directory is **not exposed publicly**.
   - Storage filenames use randomly generated UUIDs (`b27843ac-e4a8-4701-a410-583a3b66bde3.pdf`).
   - Downloads are streamed via `res.sendFile` with strict path traversal validation (`safeBasename = path.basename(document_path)`).
   - Supported MIME types: `application/pdf`, `image/jpeg`, `image/png`. Max file size: 10MB.

---

## 6. API Reference

All user routes are mounted under `/api/v1/applications`:

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Service health & dependency check |
| `POST` | `/api/v1/applications` | Student | Submit new scholarship application |
| `GET` | `/api/v1/applications/my` | Student | Get authenticated student's applications |
| `GET` | `/api/v1/applications/:id` | Owner, Admin, Reviewer | Get application details, documents & snapshot |
| `GET` | `/api/v1/applications/:id/track` | Owner, Admin, Reviewer | Get progress percentage and milestone timeline |
| `GET` | `/api/v1/applications/:id/status-history` | Owner, Admin, Reviewer | Get status change audit trail |
| `PATCH` | `/api/v1/applications/:id` | Owner Student | Update application statement / fields |
| `POST` | `/api/v1/applications/:id/withdraw` | Owner Student | Withdraw application |
| `PATCH` | `/api/v1/applications/:id/status` | Admin, Reviewer | Apply lifecycle status transition |
| `GET` | `/api/v1/applications/admin/all` | Admin, Reviewer | Paginated search with filters |
| `POST` | `/api/v1/applications/:id/documents` | Owner Student, Admin | Upload document attachment (`multipart/form-data`) |
| `GET` | `/api/v1/applications/:id/documents` | Owner, Admin, Reviewer | List attached documents |
| `GET` | `/api/v1/applications/:id/documents/:docId/download` | Owner, Admin, Reviewer | Secure document download |
| `PATCH` | `/api/v1/applications/:id/documents/:docId/verify` | Admin, Reviewer | Verify document (`VERIFIED` / `REJECTED`) |
| `DELETE` | `/api/v1/applications/:id/documents/:docId` | Owner Student, Admin | Delete document when permitted |
| `GET` | `/internal/applications/:id` | Internal Services | Fetch application for Review/Payment service |
| `PATCH` | `/internal/applications/:id/status` | Internal Services | Apply transition from Review/Payment service |

---

## 7. Setup & Execution (Native Node.js on Windows)

### Prerequisites
- Node.js (>= 18.x)
- PostgreSQL (running locally on port 5432)
- MongoDB (running locally on port 27017)

### Installation
```powershell
cd services/application-service
npm install
```

### Environment Configuration
Copy the template and configure your local settings:
```powershell
Copy-Item .env.example .env
```

Key environment variables in `.env`:
```env
PORT=3003
NODE_ENV=development

DATABASE_URL=postgresql://postgres:password@localhost:5432/scholarship_portal
PGHOST=localhost
PGPORT=5432
PGDATABASE=scholarship_portal
PGUSER=postgres
PGPASSWORD=your_postgres_password
PG_SCHEMA=public

MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=scholarship_documents

IDENTITY_SERVICE_URL=http://localhost:3001
SCHOLARSHIP_SERVICE_URL=http://localhost:3002
REVIEW_SERVICE_URL=http://localhost:3004
PAYMENT_SERVICE_URL=http://localhost:3005

JWT_SECRET=dev_jwt_secret_change_in_production_k9x2m4p7
SERVICE_TO_SERVICE_SECRET=internal_super_secret_token_change_in_prod
```

### Running Safe Migrations
```powershell
npm run migrate
```
Executes all SQL migrations (`001`, `002`) and initializes MongoDB indexes without deleting existing records.

### Starting the Service
```powershell
# Development mode with auto-reload (nodemon)
npm run dev

# Normal execution
npm start
```
The service will start on **`http://localhost:3003`**.

---

## 8. Automated Testing

The service includes comprehensive Unit, Integration, and End-to-End tests executed via npm scripts:

```powershell
# Run all test suites
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run end-to-end tests only
npm run test:e2e
```

### Test Suite Structure
1. **Unit Tests (`tests/unit/`):**
   - Application ID Generator (`application-id.test.js`)
   - State machine transition rules & progress calculation (`status.service.test.js`)
2. **Integration Tests (`tests/integration/`):**
   - Health endpoint & dependency validation
   - Authentication & role-based authorization guards
   - Application submission, Joi validation & duplicate prevention
   - Student ownership isolation (`403 Forbidden` checks)
   - Permitted field updates & document uploads
   - Reviewer verification & admin status updates
   - Internal service token authorization
3. **End-to-End Tests (`tests/e2e/`):**
   - Full lifecycle: Submission &rarr; Under Review &rarr; Approval &rarr; Disbursement &rarr; Tracking &rarr; Withdrawal restrictions

*Current Test Results:* **4 test suites passed, 36 tests passed (100% success).**

---

## 9. Windows PowerShell `curl.exe` Demonstration

Run these commands in Windows PowerShell against the running service:

### 1. Health Probe
```powershell
curl.exe -s http://localhost:3003/health
```

### 2. Login as Demo Student (via Monolith / Auth Service)
```powershell
$res = curl.exe -s -X POST http://localhost:3000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"student@demo.com\",\"password\":\"Demo@1234\"}' | ConvertFrom-Json
$studentToken = $res.token
```

### 3. Submit Application
```powershell
$body = '{\"scholarship_id\": 2, \"statement\": \"Statement of purpose for financial assistance.\"}'
curl.exe -s -X POST http://localhost:3003/api/v1/applications `
  -H "Authorization: Bearer $studentToken" `
  -H "Content-Type: application/json" `
  -d $body
```

### 4. View My Applications
```powershell
curl.exe -s -X GET http://localhost:3003/api/v1/applications/my `
  -H "Authorization: Bearer $studentToken"
```

### 5. Track Application Progress
```powershell
curl.exe -s -X GET http://localhost:3003/api/v1/applications/19/track `
  -H "Authorization: Bearer $studentToken"
```

### 6. Upload Document
```powershell
Set-Content -Path "marksheet.pdf" -Value "%PDF-1.4 sample marksheet"
curl.exe -s -X POST http://localhost:3003/api/v1/applications/19/documents `
  -H "Authorization: Bearer $studentToken" `
  -F "document=@marksheet.pdf;type=application/pdf" `
  -F "requirement_id=1" `
  -F "document_name=Semester Marksheet"
Remove-Item -Path "marksheet.pdf" -Force
```

### 7. Internal Service Transition (Payment Service Disbursement)
```powershell
$body = '{\"status\": \"DISBURSED\", \"remarks\": \"Disbursed to student bank account.\", \"caller_service\": \"payment-service\"}'
curl.exe -s -X PATCH http://localhost:3003/internal/applications/19/status `
  -H "X-Service-Token: internal_super_secret_token_change_in_prod" `
  -H "Content-Type: application/json" `
  -d $body
```

---

## 10. License & Maintainers
Developed as part of the **ApexScholar Microservices Migration Project** on branch `feature/application-service`.

# System Architecture & Service Topology
**ApexScholar — Online Scholarship Portal**  
**Course:** CS543 Web Services  

---

## 1. High-Level Architectural Diagram

```
                 +---------------------------------------------+
                 |       Frontend Client (Port 5173)           |
                 |       React 18 + Vite SPA                   |
                 +---------------------+-----------------------+
                                       |
                   HTTP / REST / Cookies / GraphQL / SOAP
                                       v
                 +---------------------------------------------+
                 |         API Gateway (Port 3000)             |
                 |  - Global Rate Limiting (100 req/min)       |
                 |  - CORS / CSRF Validation                   |
                 |  - Correlation ID Injection                 |
                 |  - Reverse Proxying & Route Dispatch        |
                 +----+---------------+---------------+--------+
                      |               |               |
                      v               v               v
  +-----------------------+   +-------------------+   +--------------------+
  | Identity Service      |   | Scholarship Svc   |   | Application Svc    |
  | Port: 3001            |   | Port: 3002        |   | Port: 3003         |
  | DB: identity_db (PG)  |   | DB: scholarship_db|   | DB: application_db |
  | - Auth (JWT & Cookies)|   | - REST Catalog    |   | - Submission Mgmt  |
  | - Session Rotation    |   | - SOAP Eligibility|   | - Dual Storage:    |
  | - RBAC & Profiles     |   | - GraphQL API     |   |   MongoDB GridFS + |
  +-----------------------+   +--------+----------+   |   Local Disk Fallback
                                       |              +---------+----------+
                                       |                        |
                                       +-----------+------------+
                                                   |
                                                   v
                                      +-------------------------+
                                      | Review Service          |
                                      | Port: 3004              |
                                      | DB: review_db (PG)      |
                                      | - Reviewer Scoring      |
                                      | - Status Synchronization|
                                      | - Admin Final Decisions |
                                      +-------------------------+
```

---

## 2. Microservice Directory & Port Allocation

| Component | Port | Technology | Primary Function |
| :--- | :--- | :--- | :--- |
| **Client Frontend** | `5173` | React 18, Vite, TailwindCSS | Student, Reviewer, and Admin unified user experience. |
| **API Gateway** | `3000` | Node.js, Express, `http-proxy` | Ingress security, global rate limiting, correlation IDs, proxy routing. |
| **Identity Service** | `3001` | Express, PostgreSQL (`identity_db`) | User registration, bcrypt authentication, refresh token reuse detection, sessions. |
| **Scholarship Service** | `3002` | Express, PostgreSQL (`scholarship_db`) | Scholarship CRUD, XML SOAP engine (`/soap`), GraphQL query engine (`/graphql`). |
| **Application Service**| `3003` | Express, PostgreSQL (`application_db`), MongoDB | Application lifecycle, document upload to MongoDB GridFS, tracking timeline. |
| **Review Service** | `3004` | Express, PostgreSQL (`review_db`) | Review committee assignment, document verification, scoring, final award decisions. |

---

## 3. Communication Protocols & Inter-Service IPC

1. **Client-to-Gateway Communication:**
   - **REST APIs:** Secured via Bearer JWTs or HttpOnly cookies (`SameSite=Strict`).
   - **GraphQL:** Client queries POSTed to `/graphql` on port 3002.
   - **SOAP:** XML envelopes sent to `/soap/eligibility` on port 3002.
2. **Gateway-to-Microservice Routing:**
   - Proxies incoming `/api/v1/auth`, `/api/v1/profile`, `/api/v1/students`, `/api/v1/admin` to `3001`.
   - Proxies `/api/v1/scholarships` to `3002`.
   - Proxies `/api/v1/applications` to `3003`.
   - Proxies `/api/v1/reviews` and `/api/reviews` to `3004`.
3. **Synchronous Inter-Service RPC:**
   - **Application -> Scholarship:** When a student creates an application, Application Service sends an authenticated HTTP request to `http://localhost:3002/api/v1/scholarships/:id` to verify that the scholarship is active and open for applications.
   - **Review -> Application:** When a reviewer or administrator records a decision in Review Service, it issues an internal HTTP PATCH request to `http://localhost:3003/internal/applications/:id/status` using an internal service token (`X-Service-Token`) to synchronize the lifecycle state.

---

## 4. Architectural Design Tradeoffs

1. **Database-per-Service:** Each microservice strictly connects to its own database (`identity_db`, `scholarship_db`, `application_db`, `review_db`). Cross-database foreign keys are prohibited; cross-service references use UUIDs or string IDs.
2. **Dual-Storage Engine:** Binary files are offloaded from PostgreSQL into MongoDB GridFS. Should MongoDB experience downtime, the system automatically writes to `uploads/` and flags `storage_provider: 'local'`, ensuring application submission is non-blocking.
3. **Public Read-Only GraphQL:** GraphQL is scoped strictly to query read operations (`scholarships`, `scholarship(id)`). State mutations are reserved for REST endpoints where centralized authentication, CSRF validation, and auditing policies apply.

# Academic Presentation Outline & Live Demonstration Script
**Project:** ApexScholar — Online Scholarship Portal  
**Course:** CS543 Web Services  
**Target Duration:** 15–20 Minutes  

---

## 1. Presentation Slide / Topic Breakdown

### Slide 1: Title & Introduction (1 Minute)
- **Title:** ApexScholar — Enterprise Multi-Protocol Scholarship Management System
- **Presenters / Candidate:** ApexScholar Development Team
- **Course:** CS543 Web Services
- **Problem Statement:** Fragmented scholarship workflows, monolithic bottlenecks, protocol silos, and document storage scalability.

### Slide 2: Architectural Overview (2 Minutes)
- **Microservices Topology:** API Gateway, Identity, Scholarship, Application, and Review Services.
- **Port Directory & Tech Stack:** Node.js, Express, PostgreSQL 16, MongoDB GridFS, React 18, Vite.
- **Inter-Service Communication:** API Gateway reverse-proxying, internal service tokens, and request correlation IDs.

### Slide 3: Web Service Protocols in Action (3 Minutes)
- **RESTful Endpoints:** Core CRUD operations, RFC error standards, pagination, and status codes.
- **SOAP & WSDL Contract:** XML-based eligibility evaluation operation (`CheckEligibility`).
- **GraphQL:** Single endpoint query engine (`/graphql`) solving over-fetching in scholarship search.
- **OpenAPI / Swagger:** Interactive live API documentation on all microservice ports.

### Slide 4: Dual-Storage & Document Security (3 Minutes)
- **Why Polyglot Persistence?** Relational ACID transactions in PostgreSQL + binary chunking in MongoDB GridFS.
- **High Availability:** Non-blocking fallback to local disk storage if MongoDB is unavailable.
- **Magic-Byte Inspection:** Defeating executable upload spoofing through binary signature verification.

### Slide 5: Defense-in-Depth Security Hardening (3 Minutes)
- **Session Management:** Refresh token rotation with immediate reuse detection (SEC-06).
- **Authentication:** HttpOnly / SameSite=Strict cookies eliminating XSS token theft (SEC-01).
- **Rate Limiting & CSRF:** Gateway rate limiting + Direct-port in-memory sliding window rate limiters (SEC-04 & SEC-05).

### Slide 6: Regression Verification & Quality Metrics (2 Minutes)
- 100% Pass rate across unit, integration, and security suites (70+ test cases).
- Verification of 11 existing application records preserved without schema alteration.
- Headless Chrome browser automation and React production bundle build.

---

## 2. Recommended Live Demonstration Sequence (5–6 Minutes)

### Step 1: Health & Architecture Verification (30 Seconds)
Open PowerShell or Browser:
- Show Gateway health endpoint: `http://localhost:3000/health`
- Show Swagger documentation: `http://localhost:3002/api-docs/`

### Step 2: Multi-Protocol Showcase (2 Minutes)
1. **REST:** Fetch scholarship catalog:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3000/api/v1/scholarships" | ConvertTo-Json
   ```
2. **GraphQL:** Execute a field-filtered query against `/graphql`:
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:3002/graphql" -Method Post -ContentType "application/json" `
     -Body '{"query": "query { scholarships { id name amount status } }"}' | ConvertTo-Json
   ```
3. **SOAP / WSDL:** Demonstrate SOAP eligibility calculation via XML request:
   ```powershell
   (Invoke-WebRequest -Uri "http://localhost:3002/soap/wsdl").Content.Substring(0, 300) + "..."
   ```

### Step 3: Security & Session Hardening Showcase (1.5 Minutes)
1. **Magic-Byte Spoofing Prevention:**
   Attempt to upload a fake `.pdf` (text/executable content) and show HTTP 400 rejection:
   `INVALID_FILE_SIGNATURE`.
2. **Refresh Token Reuse Detection:**
   Demonstrate that reusing a revoked refresh token triggers immediate session termination.

### Step 4: Web Browser User Journey (2 Minutes)
Open `http://localhost:5173`:
1. Log in as Student (`student@demo.com` / `Password@123`).
2. Show student application tracking, document uploads, and application timeline.
3. Log out and log in as Reviewer (`reviewer@portal.com` / `Reviewer@123`).
4. Show Reviewer dashboard, document review, and status update workflow.

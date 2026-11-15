# ApexScholar — Project Overview & Academic Objectives
**Course:** CS543 Web Services  
**Project:** ApexScholar — Online Scholarship Portal  
**Architecture:** Polyglot Microservices (REST, SOAP, GraphQL) with Dual Storage (PostgreSQL & MongoDB GridFS)  

---

## 1. Problem Statement & Motivation
State and institutional scholarship administration in higher education often suffers from fragmented workflows:
- **Inefficient Verification:** Students submit documents across physical counters or disjointed portals, leading to lost certificates, verification bottlenecks, and delayed funding.
- **Protocol & Integration Silos:** External government bodies, university evaluation systems, and mobile frontends often demand disparate integration interfaces—from legacy enterprise SOAP/WSDL endpoints to modern GraphQL queries and high-throughput REST APIs.
- **Storage Bottlenecks:** Relational databases struggle with multi-megabyte unstructured document uploads, leading to bloated tables and slow query performance.
- **Security Vulnerabilities:** Traditional web portals frequently expose JWTs in browser `localStorage`, lack server-side magic-byte validation against malicious file uploads, fail to enforce refresh-token reuse detection, and omit direct-service rate limits.

---

## 2. System Objectives
ApexScholar is an enterprise-grade, polyglot scholarship management platform designed to satisfy the core objectives of CS543 Web Services:
1. **Microservices Architecture:** Decouple monolithic workflows into specialized domain services:
   - **API Gateway (Port 3000):** Central ingress, JWT verification, rate limiting, and route orchestration.
   - **Identity Student Service (Port 3001):** Authentication, RBAC, session lifecycle, and profile management.
   - **Scholarship Service (Port 3002):** Scholarship catalog, rules engine, SOAP eligibility service, and GraphQL interface.
   - **Application Service (Port 3003):** Application submission, state tracking, and dual-storage document management (PostgreSQL + MongoDB GridFS).
   - **Review Service (Port 3004):** Reviewer evaluation workflow, scoring, and administrative award decisions.
2. **Multi-Protocol Service Integration:**
   - **RESTful APIs:** Standardized JSON endpoints for all stateful application workflows.
   - **SOAP/WSDL:** Strict XML contract-based web service (`/soap/wsdl` and `/soap/eligibility`) simulating inter-agency eligibility verification.
   - **GraphQL:** Flexible client-driven query endpoint (`/graphql`) enabling consumers to request custom scholarship catalog projections with zero over-fetching.
3. **Dual-Storage Engine:**
   - **PostgreSQL:** Normalized ACID-compliant relational storage across 4 isolated microservice databases (`identity_db`, `scholarship_db`, `application_db`, `review_db`).
   - **MongoDB GridFS:** Chunked, high-capacity binary storage for student certificates and income proofs, backed by an automatic local filesystem fallback for high availability.
4. **Defense-in-Depth Security:**
   - HttpOnly cookie authentication to mitigate XSS-based token theft.
   - Server-side magic-byte inspection (PDF, PNG, JPEG) to defeat malicious MIME-spoofing.
   - Cryptographic refresh token rotation with immediate reuse detection.
   - Multi-tier rate limiting (Gateway + Direct Microservice ports) and CSRF protection.

---

## 3. Key Stakeholders & Workflows
| Role | Portal Responsibilities |
| :--- | :--- |
| **Student** | Registers account, completes profile, searches scholarship catalog (REST/GraphQL), verifies eligibility (SOAP), submits applications, uploads certificates to GridFS, and tracks progress. |
| **Reviewer** | Reviews submitted applications, inspects attached documents, performs eligibility verification, records score/feedback, and recommends status updates. |
| **Administrator**| Creates and manages scholarship schemes, monitors institutional metrics, reviews reviewer recommendations, and finalizes award/rejection decisions. |

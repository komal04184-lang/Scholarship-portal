# CS543 Web Services — Viva Examination Questions & Model Answers
**Project:** ApexScholar — Online Scholarship Portal  
**Course:** CS543 Web Services  

---

### Question 1: What are the differences between REST, SOAP, and GraphQL, and how are they used in ApexScholar?
**Model Answer:**
- **REST (Representational State Transfer):** Resource-oriented architectural style utilizing standard HTTP methods (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) with JSON payloads. Used across all core microservices for state-changing CRUD operations (e.g., student registration, application submission, reviewer evaluation).
- **SOAP (Simple Object Access Protocol):** Strict, XML-based protocol defined by a formal WSDL (Web Services Description Language) contract. Implemented in Scholarship Service (`/soap/eligibility`) to model an inter-institutional/governmental RPC service for eligibility checks.
- **GraphQL:** Query language for APIs that enables clients to request the exact fields they need in a single round-trip. Implemented in Scholarship Service (`/graphql`) to allow frontends and mobile clients to query scholarship catalogs without over-fetching or under-fetching.

---

### Question 2: Why did you adopt a polyglot persistence model (PostgreSQL + MongoDB GridFS) rather than storing everything in PostgreSQL?
**Model Answer:**
- Relational databases such as PostgreSQL excel at transactional ACID guarantees, structured schemas, relational queries, and referential integrity (e.g., tracking application state transitions, user permissions, and evaluator scores).
- However, storing multi-megabyte binary documents (PDF certificates, high-resolution income proofs) directly in PostgreSQL (via `BYTEA` or Large Objects) causes database bloat, degrades buffer-cache efficiency, slows down database backups, and causes I/O bottlenecks.
- By utilizing **MongoDB GridFS**, files are automatically chunked into 255 KB blocks and stored in a specialized binary document store. PostgreSQL maintains only lightweight metadata records (checksum, MIME type, file size, `gridfs_id`), achieving optimal performance and storage efficiency.

---

### Question 3: How does the system handle high availability if MongoDB goes down during an application submission?
**Model Answer:**
- ApexScholar implements a **dual-storage fallback strategy** in Application Service.
- When an upload request arrives, the system attempts to stream the binary into MongoDB GridFS.
- If MongoDB is unreachable, times out, or throws a connection error, the service gracefully falls back to local disk storage (`uploads/`), saves the file with a UUID filename, and records `storage_provider: 'local'` in PostgreSQL.
- The student's application submission succeeds without interruption. When MongoDB connectivity is restored, files can be synchronized asynchronously.

---

### Question 4: How does ApexScholar prevent malicious file uploads (e.g., executable malware disguised as a PDF)?
**Model Answer:**
- Client-supplied file extensions and `Content-Type` headers can be easily spoofed using tools like `curl` or Postman.
- ApexScholar implements **server-side magic-byte inspection** before saving any file:
  - The server reads the initial bytes of the file buffer directly from memory.
  - A PDF must start with `%PDF` (`0x25 0x50 0x44 0x46`).
  - A PNG must start with `\x89PNG` (`0x89 0x50 0x4E 0x47`).
  - A JPEG must start with `\xFF\xD8\xFF` (`0xFF 0xD8 0xFF`).
- If an uploaded file has a `.pdf` extension but its binary signature indicates an executable or script, the request is immediately aborted with HTTP 400 (`INVALID_FILE_SIGNATURE`).

---

### Question 5: Why did you move from `localStorage` token storage to HttpOnly cookies, and how did you prevent CSRF?
**Model Answer:**
- Storing access tokens or refresh tokens in `localStorage` makes them accessible to any JavaScript running on the origin. If an attacker introduces a Cross-Site Scripting (XSS) vulnerability or malicious third-party dependency, tokens can be stolen.
- ApexScholar issues authentication tokens in **HttpOnly, Secure, SameSite=Strict** cookies, making them inaccessible to JavaScript scripts.
- To prevent Cross-Site Request Forgery (CSRF) on cookie-authenticated mutation endpoints, the API Gateway and microservices enforce `SameSite=Strict` and validate the `Origin` and `Referer` headers against the approved application origin.

---

### Question 6: What is refresh-token reuse detection (SEC-06) and why is it important?
**Model Answer:**
- In standard token rotation, refreshing an access token generates a new refresh token and revokes the previous one.
- If an attacker compromises a refresh token and attempts to use it after the legitimate user has already refreshed their session, this indicates that the token was duplicated.
- Upon receiving a revoked or previously consumed refresh token, ApexScholar's Identity Service detects a **token reuse condition**, refuses the refresh request (HTTP 401), and revokes all active descendant sessions associated with that user to protect the account against hijacking.

---

### Question 7: How do microservices communicate synchronously while maintaining loose coupling?
**Model Answer:**
- Microservices communicate over HTTP/REST using decoupled domain boundaries.
- When an application is submitted, Application Service verifies the scholarship's validity by calling Scholarship Service (`GET /api/v1/scholarships/:id`).
- When a reviewer completes an evaluation in Review Service, an internal status update is dispatched to Application Service (`PATCH /internal/applications/:id/status`).
- Internal endpoints are secured using mutual shared service tokens (`X-Service-Token`) and correlated using `X-Correlation-ID` headers to trace requests across microservice logs.

---

### Question 8: How is authorization enforced in GraphQL compared to REST?
**Model Answer:**
- In REST, authorization is applied per-endpoint using Express middleware (`authenticate`, `authorize(['admin'])`).
- In ApexScholar, GraphQL (`/graphql`) is intentionally designated as a **public catalog query interface**. Its schema only defines a `Query` root type (`scholarships`, `scholarship(id)`) and exposes no mutations.
- Because scholarship catalog discovery is public by definition, query access is unauthenticated, mirroring `GET /api/v1/scholarships`. All state changes (create, edit, delete, status changes) must go through REST endpoints protected by JWT and RBAC middleware.

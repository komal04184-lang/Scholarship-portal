# ApexScholar Inter-Service Communication

## 1. Overview

ApexScholar utilizes a combination of **Synchronous REST APIs**, **API Gateway reverse proxying**, and **Asynchronous Scrutiny Callbacks** to ensure low coupling and high cohesion among microservices.

---

## 2. Distributed Tracing & Correlation IDs

Every inbound request reaching the API Gateway is tagged with a UUID Correlation ID:
- Header: `X-Correlation-ID: <uuid>`
- The Gateway automatically generates a new UUID if none is supplied by the client.
- The `X-Correlation-ID` is forwarded downstream in headers to all microservices.
- Each microservice attaches the correlation ID to its internal logging context and propagates it in the response header back to the client.

---

## 3. Reviewer Scrutiny Decision Sync

When an authorized reviewer submits a final grant decision on the Review Service:
1. Review Service validates that all attached documents are marked `VERIFIED` and student eligibility is set to `true`.
2. Review Service updates its local PostgreSQL database (`review_db`) to `APPROVED`.
3. Review Service makes an internal HTTP `PATCH` call to `http://localhost:3003/api/v1/applications/:id/status` using the reviewer's JWT credentials.
4. If the call succeeds, `callback_status` is marked `SYNCED`.
5. If the Application Service is temporarily unreachable, `callback_status` remains `PENDING` and a retry daemon (`retryPendingCallbacks`) queues the update for eventual consistency without failing the reviewer's transaction.

---

## 4. GridFS Document Processing Pipeline

1. **Upload**: Student selects a document file in the frontend modal.
2. **Submission**: Multipart/form-data POST request arrives at `/api/v1/applications/:id/documents` on Application Service.
3. **Storage Pipeline**:
   - Checksum is computed (SHA-256).
   - Document buffer is written to MongoDB GridFS bucket `documents` in database `scholarship_documents`.
   - GridFS ObjectId is recorded alongside metadata in PostgreSQL table `application_documents`.
   - Backup local copy is written to `uploads/` directory.
4. **Download**: Authorized reviewer or student requests `/api/v1/documents/:id/download`. The service retrieves the binary stream from GridFS and pipes it directly into the HTTP response.

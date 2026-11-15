# PHASE 0 AUDIT REPORT & VERIFICATION MATRIX

**Project:** ApexScholar — Online Scholarship Portal  
**Audit Status:** Complete, Verified Against Source Code & Reconciled  
**Date:** 2026-11-15  

---

## 1. Executive Summary & Validation Pass Findings

A comprehensive, code-level inspection was performed across all microservices (`api-gateway`, `identity_student_service`, `scholarship-service`, `application-service`, `review-service`), the React frontend (`client`), and root configurations (`docker-compose.yml`, root scripts).

### Outcome of Validation Pass on Initial Findings:
1. **Invalid Findings Discarded / Corrected:**
   - **Review Service Swagger UI Missing (Former #13):** Disproved. Review Service already implements Swagger UI using `swagger-ui-express` loaded from `services/review-service/docs/openapi.yaml` at `/api-docs` (`services/review-service/src/app.js:51-62`).
   - **Document Upload Validation Missing (Former #14):** Disproved. `document.routes.js` (lines 28–45) enforces `fileFilter` validating MIME types against `env.upload.allowedMimes` and limits file size to `env.upload.maxFileSize` with Multer.
   - **Request Validation Unknown Property Stripping (Former #12):** Disproved. `validate-request.js` (line 12) explicitly sets `stripUnknown: true` on Joi schema validation.
   - **ApiResponse Status Handling (Former #11):** Corrected. `ApiResponse.created` already exists (line 22 of `api-response.js`) and `ApiResponse.success` accepts `statusCode = 200` as the fourth parameter.
   - **Downstream Services Exposing Health Post-Auth (Former #4):** Corrected. All 4 microservices already mount their `/health` endpoints prior to authentication middleware.

---

## 2. Deep-Dive Reconciliation of 10 Specific Audit Areas

Below is the verified code-level status for each of the 10 requested areas:

### 1. Scholarship Status Compatibility between Scholarship Service and Application Service
- **Status:** **Already fixed**
- **Evidence:**
  - `services/scholarship-service/src/controllers/scholarshipController.js:89-97` maps status transitions to database valid values: `open` and `active` are mapped to `published`. Allowed values in `scholarshipController.js` are `['draft', 'published', 'closed', 'archived', 'open', 'active']`.
  - `services/application-service/src/services/eligibility.service.js:15-17`:
    ```javascript
    const status = String(scholarship.status || '').toUpperCase();
    const activeStatuses = ['ACTIVE', 'OPEN', 'PUBLISHED'];
    if (status && !activeStatuses.includes(status)) { ... }
    ```
  - Both services now accept and agree on `published`, `open`, and `active` as valid active scholarship statuses.

### 2. Review Service Authentication and Review Creation Flow
- **Status:** **Already fixed**
- **Evidence:**
  - `services/review-service/src/routes/reviewRoutes.js:6-8`: `router.post('/', requireServiceOrReviewer, controller.createReview);`
  - `services/review-service/src/middleware/auth.js:59-71`: `requireServiceOrReviewer` checks `X-Service-Token` matching `process.env.INTERNAL_SERVICE_TOKEN` using `crypto.timingSafeEqual` first. If present, it assigns service admin credentials (`req.user = { id: 'service', role: 'admin' }`). If not present, it validates the caller's JWT token for role `reviewer` or `admin`.
  - The review creation flow allows automated creation from `application-service` (via `X-Service-Token`) as well as manual reviewer creation via authenticated JWT.

### 3. MongoDB GridFS Fallback and Document Storage Consistency
- **Status:** **Already fixed**
- **Evidence:**
  - `services/application-service/src/services/document.service.js:10-16, 48-73, 222-248`:
    - When a document is uploaded, it is saved to the local disk (`env.upload.dir`). If MongoDB GridFS is reachable, it additionally streams to GridFS and records `gridfs_id` in PostgreSQL (`application_documents.gridfs_id`).
    - On download (`document.service.js:227-246`), it checks `gridfs_id` and GridFS availability; if MongoDB fails or is unavailable, it seamlessly falls back to reading the file from the local storage disk (`source: 'filesystem'`).
  - Graceful fallback is intact without blocking uploads or downloads if MongoDB is offline.

### 4. Review Service Callback Retry Mechanism
- **Status:** **Confirmed defect (Partial Implementation)**
- **Evidence:**
  - `services/review-service/src/services/reviewService.js:81-92` provides `retryPendingCallbacks()` which queries `model.listPendingCallbacks()` (reviews where `callback_status = 'PENDING'`) and invokes `updateApplicationStatus(...)`.
  - However, in `services/review-service/src/server.js:10-15`, `retryPendingCallbacks()` is called **only once upon service startup**:
    ```javascript
    import('./services/reviewService.js').then(({ retryPendingCallbacks }) => {
      retryPendingCallbacks().then(n => { ... });
    });
    ```
  - There is no recurring cron/interval (e.g. `setInterval(retryPendingCallbacks, 60000)`) to re-sync if the Application Service was down during a reviewer's decision and recovers while Review Service remains running.
- **Proposed Correction:** Add an interval or background worker in Review Service to retry pending status sync callbacks periodically (e.g. every 60 seconds).

### 5. Review Service Application Service URL Configuration
- **Status:** **Already fixed**
- **Evidence:**
  - `services/review-service/.env:18`: `APPLICATION_SERVICE_URL=http://localhost:3003`.
  - `services/review-service/src/clients/applicationClient.js:1-4`:
    ```javascript
    const baseUrl = () => (process.env.APPLICATION_SERVICE_URL || 'http://localhost:3003').replace(/\/$/, '');
    ```
  - Endpoints called: `${baseUrl()}/api/v1/applications/${encodeURIComponent(applicationId)}/status`. Matches Application Service router mounted at `/api/v1/applications`.

### 6. Application Service Placeholder Scholarship Fallback
- **Status:** **Confirmed defect (Dead / Legacy Code Risk)**
- **Evidence:**
  - `services/application-service/src/services/eligibility.service.js:1-13` uses the active client `src/clients/scholarship.client.js` which performs strict HTTP calls with no fallback.
  - However, `services/application-service/src/clients/scholarshipServiceClient.js:96-107` and `src/clients/studentServiceClient.js:45-50` still exist in the repository with hardcoded mock fallback flags (`config.services.fallbackEligibilityCheck`, returning `Scholarship #${scholarshipId}`).
  - While not actively imported by `eligibility.service.js`, having legacy duplicate clients creates confusion and drift.
- **Proposed Correction:** Remove or archive unused duplicate client files (`scholarshipServiceClient.js`, `studentServiceClient.js`) in `application-service/src/clients/`.

### 7. API Gateway Correlation-ID Propagation and Downstream Health Accuracy
- **Status:** **Confirmed defect (Probe Socket Timeout & Client Route Mismatch)**
- **Evidence:**
  - **Correlation-ID Propagation:** In `api-gateway/src/app.js:31-36`, middleware creates and attaches `req.correlationId` and header `X-Correlation-ID`. In `makeProxy` (`api-gateway/src/app.js:208-213`), `proxyReq.setHeader('X-Correlation-ID', req.correlationId)` forwards it to downstream services. This is functional.
  - **Downstream Health Probe:** In `api-gateway/src/app.js:90-113`, `probeService` attaches `req.on('timeout')`, but Node HTTP `http.get({ timeout })` only sets socket inactivity timeout. An explicit overarching timer or `req.destroy()` is required to prevent hung connection attempts.
  - Furthermore, `client/src/services/api.js:955-993` does not call `api-gateway`'s `/health` endpoint, bypassing this health monitoring completely.

### 8. Frontend JWT Storage and Authentication Security
- **Status:** **Confirmed defect (Security Hygiene)**
- **Evidence:**
  - `client/src/services/api.js:222-257`: JWT tokens are stored in `localStorage` under key `apex_token` (`localStorage.setItem(TOKEN_KEY, token)`).
  - While backend services set HTTP-only cookies (`auth.controller.js:14-20`), the frontend still stores and passes the raw Bearer token via `Authorization: Bearer ${token}`.
  - Storing sensitive access tokens in `localStorage` exposes them to XSS vulnerabilities compared to strictly using HTTP-only cookies or memory storage.
- **Proposed Correction:** Ensure all protected routes accept the HTTP-only cookie, or treat `localStorage` strictly as an authenticated session cache with refreshed short-lived tokens.

### 9. Scholarship Pagination, Response Mapping and ID Normalization
- **Status:** **Already fixed**
- **Evidence:**
  - **Scholarship Service:** `services/scholarship-service/src/services/scholarshipService.js:174-230` supports both cursor-based pagination and standard offset pagination (`page`, `limit`, returning `total`, `totalPages`, `items`).
  - **Frontend Normalizer:** `client/src/services/api.js:156-208` (`normalizeScholarship`) and `api.js:300-323` robustly maps all response formats:
    ```javascript
    const rawList = res.items || res.scholarships || res.data || (Array.isArray(res) ? res : []);
    ```
    and maps `s.scholarship_id || s.id`, `s.title || s.name`, `s.award_amount || s.amount`, etc.

### 10. PostgreSQL Schema, Migration and Database Consistency
- **Status:** **Confirmed defect (Schema Documentation & Migration Drift)**
- **Evidence:**
  - Four independent databases exist: `identity_db`, `scholarship_db`, `application_db`, `review_db`.
  - In `scholarship-service`, `database/schema.sql` and `database/init.sql` define a simplified single-table schema (`id BIGSERIAL` or `id UUID`).
  - In contrast, `database-verification/scholarship_schema.sql` reflects the true live production schema with `scholarship_id bigint`, `scholarship_categories`, `scholarship_eligibility_criteria`, `scholarship_required_documents`, and `scholarship_status_history`.
  - `scholarshipService.js` (lines 80–140) queries the normalized tables (`scholarships s LEFT JOIN scholarship_categories ...`), which match `database-verification/scholarship_schema.sql`, NOT `database/schema.sql`.
- **Proposed Correction:** Synchronize and document the authoritative schema definitions so `database/schema.sql` reflects the normalized multi-table database structure.

---

## 3. Final Verified Defect List (Consolidated & Categorized)

| ID | Category | Severity | File & Line | Summary | Proposed Fix |
|:---|:---|:---:|:---|:---|:---|
| **DEF-01** | Fake Metrics | **High** | `client/src/services/api.js:730-757` | `getAdminMetrics()` catches 404 from `/admin/dashboard` and returns hardcoded synthetic statistics (`total_applications: 5`, etc.). | Implement `/api/v1/applications/admin/stats` in Application Service; connect client API to live metrics. |
| **DEF-02** | Broken API Fallback | **High** | `client/src/services/api.js:769-772, 812-819` | Client falls back to non-existent monolith routes (`/admin/applications`) when microservice calls encounter errors. | Remove monolith fallback; standardize on `/api/v1/applications/admin/all` and `/api/v1/applications/:id/status`. |
| **DEF-03** | Health Check Bypass | **Medium** | `client/src/services/api.js:955-993` | Frontend probes arbitrary routes and returns fake connected status rather than calling Gateway `/health`. | Direct `checkSystemHealth` to the Gateway's centralized `/health` endpoint. |
| **DEF-04** | Null Safety | **Medium** | `services/identity_student_service/backend/src/repositories/profile.repository.js:27-28, 95-96, 152-153` | `Number(null)` coercing missing `family_income` and `family_size` into `0` or `1`. | Use `toNullableNumber()` to preserve `null` for missing optional numeric profile values. |
| **DEF-05** | Callback Retry | **Medium** | `services/review-service/src/server.js:10-15` & `reviewService.js:81-92` | Review decision status sync to Application Service only retries once at boot, not periodically. | Add a recurring interval timer to `retryPendingCallbacks()` to ensure background convergence. |
| **DEF-06** | Dead Fallback Code | **Low** | `services/application-service/src/clients/scholarshipServiceClient.js:96-107` | Legacy client with mock fallback logic retained in codebase alongside active `scholarship.client.js`. | Clean up legacy unused clients to prevent confusion. |
| **DEF-07** | Gateway Probe Timeout | **Low** | `api-gateway/src/app.js:90-113` | HTTP probe socket timeout lacks hard request abort timer. | Add explicit hard timeout destroying the request after `timeoutMs`. |
| **DEF-08** | Redundant Route | **Low** | `services/application-service/src/routes/application.routes.js:21` | Redundant router health endpoint under `/api/v1/applications/health` duplicating root `/health`. | Consolidate and document single root `/health` endpoint. |
| **DEF-09** | Validation Category Clutter | **Low** | `services/scholarship-service/src/utils/validation.js:1-11` | Duplicate category names with inconsistent hyphenation (`Need-Based` vs `Need Based`). | Normalize categories to canonical set with hyphen/whitespace strip comparison. |
| **DEF-10** | Schema Documentation Drift | **Low** | `services/scholarship-service/database/schema.sql` vs `database-verification/scholarship_schema.sql` | `database/schema.sql` defines simplified flat schema while real DB uses normalized multi-table schema. | Align migration schema files with live production schema. |

---

## 4. Corrected Implementation Priority List (Phased Roadmap)

| Phase | Task ID | Component | Action Item |
|:---:|:---:|:---|:---|
| **Phase 1** | **INT-01** | API Gateway | Harden `probeService` with explicit socket cancellation. Verify correlation-ID propagation. |
| **Phase 1** | **INT-02** | Identity Service | Update `profile.repository.js` to preserve `null` for `family_income` and `family_size` via `toNullableNumber()`. |
| **Phase 1** | **INT-03** | Scholarship Service | Canonicalize `ALLOWED_CATEGORIES` in `validation.js`. Synchronize `database/schema.sql` with normalized live schema. |
| **Phase 1** | **INT-04** | Review Service | Add periodic interval for `retryPendingCallbacks()` in `server.js`. |
| **Phase 2** | **INT-05** | Application Service | Implement `/api/v1/applications/admin/stats` aggregation endpoint. Remove legacy duplicate client files. |
| **Phase 2** | **INT-06** | Frontend API Client | Replace fake metrics in `getAdminMetrics()` with live backend stats. Remove monolith route fallbacks. |
| **Phase 2** | **INT-07** | Frontend API Client | Route `checkSystemHealth()` directly to Gateway `/health`. |
| **Phase 3** | **VER-01** | E2E Testing | Execute full multi-role end-to-end journey with real databases to verify all workflows without mock data. |

---

*This document represents the finalized, verified Phase 0 reconciliation. No application code, schemas, or data were altered.*

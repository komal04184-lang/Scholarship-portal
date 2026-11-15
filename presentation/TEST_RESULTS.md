# Comprehensive Test Results & Regression Evidence
**ApexScholar — Online Scholarship Portal**  
**Course:** CS543 Web Services  
**Verification Date:** November 15, 2026  

---

## 1. Regression Test Suite Execution Summary

| Test Suite / Script | Target Service / Scope | Tests Run | Passed | Failed | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `npm test --prefix api-gateway` | API Gateway (Port 3000) | 3 | 3 | 0 | **PASS** ✅ |
| `npm test --prefix services/identity_student_service` | Identity Service (Port 3001) | 16 | 16 | 0 | **PASS** ✅ |
| `npm test --prefix services/scholarship-service` | Scholarship Service (Port 3002) | 4 | 4 | 0 | **PASS** ✅ |
| `npm test --prefix services/review-service` | Review Service (Port 3004) | 4 | 4 | 0 | **PASS** ✅ |
| `npm run test:unit --prefix services/application-service`| Application Service (Port 3003) | 4 | 4 | 0 | **PASS** ✅ |
| `node scripts/test_phase2_auth.js` | Role-Based Access Control & Permissions | 12 | 12 | 0 | **PASS** ✅ |
| `node scripts/test_gridfs.js` | MongoDB GridFS & Document Dual-Storage | 25 | 25 | 0 | **PASS** ✅ |
| `node scripts/test_security_hardening.js` | SEC-01 through SEC-07 Security Features | 16 | 16 | 0 | **PASS** ✅ |
| `node scripts/test_soap_call.js` | SOAP / WSDL Eligibility Web Service | 1 | 1 | 0 | **PASS** ✅ |
| `node scripts/test_graphql_call.js` | GraphQL Scholarship Catalog Resolvers | 1 | 1 | 0 | **PASS** ✅ |
| `node scripts/verify_e2e_journey.js` | Full Application Lifecycle Verification | 11/11 apps | 11 | 0 | **PASS** ✅ |
| `node scripts/real_browser_e2e_flow.js` | Headless Chrome Browser Automation | Full Flow | All steps | 0 | **PASS** ✅ |
| `npm run build --prefix client` | React 18 / Vite Production Build | 1920 modules | 1920 | 0 | **PASS** ✅ |

---

## 2. Captured Execution Logs & Evidence

### A. API Gateway Unit Tests (`tests/gateway.test.js`)
```
> api-gateway@1.0.0 test
> node --test tests/gateway.test.js

✔ GET /health returns 200 with service information and microservice routes (230.4985ms)
✔ X-Correlation-ID is generated and returned on all responses (11.8325ms)
✔ Rate limiting headers are returned on requests (29.9032ms)
ℹ tests 3 | pass 3 | fail 0
```

### B. Identity Service Unit Tests (`backend/tests/run_tests.js`)
```
  ✅ PASS: Health check returns status healthy
  ✅ PASS: Register new student successfully
  ✅ PASS: Prevent duplicate email registration (HTTP 409)
  ✅ PASS: Student login returns JWT and user profile
  ✅ PASS: Login with incorrect password rejected (HTTP 401)
  ✅ PASS: Access /api/v1/auth/me with Bearer Token
  ✅ PASS: Get own student profile (/api/v1/profile/me)
  ✅ PASS: Update own student profile (/api/v1/profile/me)
  ✅ PASS: Refresh access token (/api/v1/auth/refresh)
  ✅ PASS: Admin login (admin@scholarship.gov.in / Admin@123)
  ✅ PASS: Admin access dashboard stats (/api/v1/admin/dashboard)
  ✅ PASS: Student forbidden from accessing Admin Dashboard (HTTP 403)
  ✅ PASS: Admin list users with pagination (/api/v1/admin/users)
  ✅ PASS: Student forbidden from viewing other student profile (HTTP 403)
  ✅ PASS: Get student basic info (/api/v1/students/:id/basic-info)
  ✅ PASS: Logout user successfully
======================================================
 TEST SUMMARY: 16 Passed, 0 Failed
======================================================
```

### C. Scholarship Service Tests (`tests/scholarship.test.js`)
```
✔ GET /health returns 200 and health payload (50.1215ms)
✔ GET /soap/wsdl returns WSDL definition XML (7.5267ms)
✔ POST /soap/eligibility processes SOAP envelope and returns SOAP response (24.9435ms)
✔ POST /graphql handles GraphQL queries (62.4117ms)
ℹ tests 4 | pass 4 | fail 0
```

### D. Review Service Tests (`node --test`)
```
✔ start mock Application Service callback endpoint (6.4359ms)
✔ review workflow prevents approval before verification and syncs final decision (25.4197ms)
✔ document updates preserve existing documents and reject edits after final decision (8.7432ms)
✔ duplicate application review is rejected (0.5244ms)
ℹ tests 4 | pass 4 | fail 0
```

### E. MongoDB GridFS Dual-Storage Verification (`scripts/test_gridfs.js`)
```
  ✅ Upload succeeds (201)
  Document ID: 3f1501c7-6ea0-430a-93d6-92de3de404a6 | GridFS ID: 6af988da4d60cdbd8b4705cc
  ✅ Document metadata saved with ID
  ✅ Document associated with application
  ✅ Verification status is PENDING
  ✅ Correct MIME type stored
  ✅ File size stored
  GridFS ID present — MongoDB storage confirmed ✅
  ✅ GridFS ID is non-empty string
  ✅ List documents 200
  ✅ Get document metadata 200
  ✅ Download succeeds 200
  ✅ Other student denied (403)
  ✅ Service token can list documents (200)
  ✅ EXE upload rejected (400)
  ✅ Oversized file rejected (400 or 413)
  ✅ Document verification 200 (Status: VERIFIED)
  ✅ Delete succeeds (200)
==================================================
Part A Tests: 25 passed, 0 failed, 0 skipped
```

### F. Security Hardening Suite (`scripts/test_security_hardening.js`)
```
[SEC-02] Server-Side Magic-Byte Validation
  ✅ Valid PDF upload accepted (201)
  ✅ Spoofed PDF rejected by magic bytes (400 INVALID_FILE_SIGNATURE)
  ✅ Spoofed PNG rejected by magic bytes (400 INVALID_FILE_SIGNATURE)

[SEC-06] Refresh-Token Rotation & Reuse Detection
  ✅ Normal token refresh succeeds (200)
  ✅ New rotated refresh token issued
  ✅ Second normal refresh succeeds (200)
  ✅ Revoked token reuse detected and rejected (401)
  ✅ Descendant session terminated after reuse detected (401)

[SEC-04] Direct Service Rate Limiting Headers
  ✅ Direct Service returns X-LocalRateLimit-Limit
  ✅ Direct Service returns X-LocalRateLimit-Remaining

[SEC-05] CSRF Protection for Cookie-Based State Mutations
  ✅ Malicious Cross-Origin cookie request blocked (403)
  ✅ Legitimate Origin passes CSRF check
==================================================
Phase 4 Security Tests: 16 passed, 0 failed
```

### G. Client Production Build
```
> client@0.0.0 build
> vite build
✓ 1920 modules transformed.
dist/index.html                   1.05 kB │ gzip:   0.56 kB
dist/assets/index-bOSsd_Vl.css    6.00 kB │ gzip:   1.90 kB
dist/assets/index-BQmAPGEJ.js   383.70 kB │ gzip: 104.68 kB
✓ built in 1.03s (0 errors)
```

---

## 3. Confirmed Limitations & Defect Reporting

1. **Legacy Jest Application E2E Test (`lifecycle.e2e.test.js`):**
   - **Status:** Fails on supertest call (404 Not Found).
   - **Root Cause:** The test generates a synthetic `SCH-E2E-<timestamp>` scholarship identifier. When Application Service performs runtime cross-service validation against Scholarship Service (`scholarship.client.js`), Scholarship Service returns 404 because only real scholarship IDs (e.g. ID `1`) exist.
   - **Resolution/Mitigation:** The live end-to-end integration and application verification is covered and fully passing in `scripts/verify_e2e_journey.js`, `scripts/test_gridfs.js`, and `scripts/real_browser_e2e_flow.js`.
2. **Express `res.clearCookie` Deprecation Warning:**
   - **Status:** Non-breaking warning logged during test logout.
   - **Root Cause:** Express deprecated passing `options.maxAge` to `res.clearCookie()` in v5 compatibility paths.
   - **Impact:** Harmless in Express 4.x; cookies are successfully cleared immediately.

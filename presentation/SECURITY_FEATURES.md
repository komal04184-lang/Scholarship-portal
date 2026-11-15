# Security Features & Hardening Implementation
**ApexScholar — Online Scholarship Portal**  
**Course:** CS543 Web Services  

---

## 1. Security Architecture Summary

ApexScholar implements a multi-layered defense-in-depth security model addressing authentication, session lifecycle, input validation, rate limiting, and transport security.

```
       +-------------------------------------------------------------+
       |                  Client Request (Browser / API)             |
       +------------------------------+------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       | Layer 1: Ingress Gateway Protection                         |
       | - Global Rate Limiter: 100 requests / 15 minutes            |
       | - CORS Policy with strict Origin Whitelist                  |
       | - X-Correlation-ID tracing on all requests                  |
       +------------------------------+------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       | Layer 2: Authentication & Session Management                |
       | - HttpOnly, Secure, SameSite=Strict cookies                 |
       | - Short-lived Access Tokens (15m) + Long-lived Refresh (7d) |
       | - Refresh Token Rotation & Immediate Reuse Detection        |
       +------------------------------+------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       | Layer 3: Direct Microservice Rate Limiting (Ports 3001-3004)|
       | - Local In-Memory Sliding Window Rate Limiting              |
       | - Sensitive endpoint guards (Login, Register, Upload)       |
       +------------------------------+------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       | Layer 4: Role-Based Access Control (RBAC)                   |
       | - Role checks: Student, Reviewer, Admin                     |
       | - Ownership verification (Students access only own records) |
       +------------------------------+------------------------------+
                                      |
                                      v
       +-------------------------------------------------------------+
       | Layer 5: Document Upload & Binary Validation                |
       | - Server-Side Magic-Byte Signature Validation (PDF/PNG/JPG) |
       | - Strict File Size Bounds (10 MB)                           |
       | - SHA-256 Checksum Calculation                              |
       +-------------------------------------------------------------+
```

---

## 2. Hardened Security Controls (Phase 4 Implementations)

### SEC-01: HttpOnly Cookie Authentication
- **Problem:** Storing JWT access and refresh tokens in browser `localStorage` leaves tokens vulnerable to extraction via Cross-Site Scripting (XSS).
- **Remediation:** Both access and refresh tokens are transmitted via `HttpOnly`, `SameSite=Strict`, `Secure` cookies. JavaScript running in the browser cannot read raw token strings, shielding user credentials against client-side script theft.

### SEC-02: Server-Side Magic-Byte File Validation
- **Problem:** Attackers can rename executable payloads (e.g., `payload.exe` or `malware.sh`) to `statement.pdf` and spoof the HTTP `Content-Type: application/pdf` header.
- **Remediation:** Application Service reads the initial binary bytes (file header) before writing to MongoDB GridFS:
  - **PDF:** First 4 bytes must equal `%PDF` (`0x25 0x50 0x44 0x46`).
  - **PNG:** First 4 bytes must equal `\x89PNG` (`0x89 0x50 0x4E 0x47`).
  - **JPEG:** First 3 bytes must equal `\xFF\xD8\xFF` (`0xFF 0xD8 0xFF`).
  - Files with invalid signatures are immediately aborted with HTTP 400 (`INVALID_FILE_SIGNATURE`).

### SEC-04: Multi-Tiered Rate Limiting
- **Gateway Rate Limiting:** Global limiter enforcing 100 requests per 15 minutes per client IP across public ingress (`Port 3000`).
- **Direct Microservice Rate Limiting:** In-memory sliding-window limiters implemented directly on sensitive microservice endpoints (Ports 3001–3004) returning `X-LocalRateLimit-Limit` and `X-LocalRateLimit-Remaining` headers to protect internal ports from brute-force attempts.

### SEC-05: CSRF Protection
- Cross-Site Request Forgery is mitigated for cookie-authenticated mutation routes (`POST`, `PUT`, `PATCH`, `DELETE`) through strict `Origin` and `Referer` validation matching trusted domain origins, complemented by `SameSite=Strict` cookie policies.

### SEC-06: Refresh-Token Rotation & Reuse Detection
- **Mechanism:** Every time a refresh token is exchanged at `/api/v1/auth/refresh`, the consumed token is invalidated, and a newly generated refresh token is issued to the client.
- **Reuse Safeguard:** If an invalidated or previously consumed refresh token is presented again (indicating token theft by an attacker), the system identifies the reuse event, logs a security alert, and immediately revokes all descendant sessions for that user account.

### SEC-07: Production Startup Secret Guards
- Each microservice validates environment secrets during startup. Default development fallbacks (e.g. `'jwt-secret-key'`) trigger fatal warnings or halts in production environments, preventing accidental deployment of default credentials.

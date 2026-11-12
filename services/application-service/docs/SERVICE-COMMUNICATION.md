# ApexScholar - Service-to-Service Communication Guide

This document defines how the **Application Microservice** communicates with other services in the ApexScholar microservices ecosystem.

---

## 1. Microservice Topology

| Service | Port | Database | Primary Responsibility |
|---|---|---|---|
| **API Gateway** | 3000 | None | Route orchestration, SSL, rate-limiting |
| **Auth & Student Identity Service** | 3001 | MongoDB (`users`) | Auth, registration, login, student profile, JWT |
| **Scholarship Service** | 3002 | PostgreSQL (`scholarship`) | Scholarship catalogue, eligibility criteria, deadlines |
| **Application Service** | **3003** | **PostgreSQL + MongoDB** | **Applications, status history, documents, tracking** |
| **Review Service** | 3004 | MongoDB / PostgreSQL | Reviewer assignment, scrutiny, decisions |
| **Payment Service** | 3005 | PostgreSQL (`payments`) | Bank disbursement, vouchers, payment logs |

---

## 2. Interaction Flows

### A. Application Submission Flow
```
Student (Frontend)
       |
       | 1. POST /api/v1/applications (JWT Cookie/Bearer)
       v
Application Service (3003)
       |
       | 2. Verify Identity (Token / GET /api/v1/profile/me)
       v
Student Identity Service (3001)
       |
       v
Application Service
       |
       | 3. GET /api/v1/scholarships/:id (Active & Deadline check)
       v
Scholarship Service (3002)
       |
       v
Application Service
       |
       | 4. Save Application & Audit (PostgreSQL Transaction)
       | 5. Save Snapshot (MongoDB)
       | 6. POST /api/v1/reviews/events/application-submitted (Async)
       v
Review Service (3004)
```

---

### B. Application Scrutiny & Review Decision Flow
1. Reviewer logs into Portal.
2. Review Service queries `GET /internal/applications/:id` from Application Service.
3. Reviewer approves or requests documents.
4. Review Service calls `PATCH /internal/applications/:id/status` on Application Service:
   ```json
   {
     "status": "APPROVED",
     "remarks": "Approved by Dr. Rajesh Verma (Reviewer #1)",
     "caller_service": "review-service"
   }
   ```
5. Application Service validates state machine transition and updates `application` and `application_status`.

---

### C. Scholarship Disbursement Flow
1. Application status transitions to `APPROVED`.
2. Payment Service queries `GET /internal/applications?status=APPROVED`.
3. Payment Service disburses funds and calls `PATCH /internal/applications/:id/status` with `DISBURSED`.
4. Application Service marks application `DISBURSED` and calculates 100% completion in student tracking.

---

## 3. Resilience & Degradation Strategy

1. **Identity Service Offline:** Application Service decodes and verifies incoming cryptographically-signed JWT tokens locally using the shared secret/algorithm, allowing uninterrupted student operations.
2. **Scholarship Service Offline:** Controlled via `FALLBACK_ELIGIBILITY_CHECK=true`. When offline, fallback cache or active metadata is applied to prevent total user submission blockages during microservices rolling updates.
3. **Review Service Offline:** Event notifications are dispatched asynchronously; failure to notify Review Service does not abort or roll back a student's submission.


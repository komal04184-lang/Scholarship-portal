# ApexScholar - Application Microservice API Contract

This document provides the complete API specification and contract for the **Application Microservice** (Port 3003) in the ApexScholar microservices architecture.

---

## 1. General Conventions

- **Base URL:** `http://localhost:3003/api/v1/applications`
- **Internal Base URL:** `http://localhost:3003/internal`
- **Content-Type:** `application/json` (except document upload which uses `multipart/form-data`)
- **Authentication:**
  - Standard user endpoints: Bearer JWT token in `Authorization` header (`Bearer <token>`) or HTTP-only `token` cookie (Student Identity Service).
  - Internal service endpoints: `X-Service-Token` header with pre-shared secret.

### Standard Response Envelope

#### Success (2xx)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

#### Error (4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable explanation",
    "details": [ ... ]
  }
}
```

---

## 2. Public / Health Endpoints

### `GET /health`
- **Purpose:** Health check probe for load balancers, orchestrators, and gateways.
- **Auth:** Public
- **Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "application-service",
  "port": 3003,
  "uptime": 124.5,
  "timestamp": "2026-11-12T17:30:00.000Z",
  "dependencies": {
    "postgres": { "connected": true, "database": "scholarship_portal" },
    "mongodb": { "connected": true, "database": "scholarship_documents" }
  }
}
```

---

## 3. Student Application Endpoints

### `POST /api/v1/applications`
- **Purpose:** Submit a new scholarship application.
- **Auth:** Student (`role: 'student'`)
- **Headers:**
  - `Authorization: Bearer <JWT>`
  - `Idempotency-Key: <UUID>` *(Optional, recommended)*
- **Request Body:**
```json
{
  "scholarship_id": 2,
  "statement": "Statement explaining merit and financial requirements...",
  "academic_year": "2026-2027"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "application": {
      "application_id": "19",
      "application_number": "APP-2026-00019",
      "student_id": "1",
      "scholarship_id": "2",
      "status": "SUBMITTED",
      "submitted_at": "2026-11-12T13:26:05.567Z"
    },
    "scholarship": {
      "scholarship_id": "2",
      "name": "Women in STEM Scholarship",
      "amount": "100000.00"
    }
  }
}
```
- **Error Codes:**
  - `400 BAD_REQUEST`: Missing scholarship_id or statement.
  - `401 UNAUTHORIZED`: Invalid or missing token.
  - `409 CONFLICT`: Duplicate application for this scholarship.

---

### `GET /api/v1/applications/my`
- **Purpose:** Get all applications submitted by the logged-in student.
- **Auth:** Student
- **Query Parameters:**
  - `status`: Filter by status (e.g. `SUBMITTED`, `APPROVED`)
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Student applications retrieved successfully",
  "data": {
    "applications": [
      {
        "application_id": "19",
        "application_number": "APP-2026-00019",
        "student_id": "1",
        "scholarship_id": "2",
        "status": "SUBMITTED",
        "document_count": "1",
        "submitted_at": "2026-11-12T13:26:05.567Z"
      }
    ]
  }
}
```

---

### `GET /api/v1/applications/:id`
- **Purpose:** Get comprehensive details of an application, attached documents, and status timeline.
- **Auth:** Owner Student, Admin, or Reviewer.
- **Access Control:** Student can only view their own application (403 if ID belongs to another student).
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Application details retrieved successfully",
  "data": {
    "application": {
      "application_id": "19",
      "application_number": "APP-2026-00019",
      "student_id": "1",
      "scholarship_id": "2",
      "status": "SUBMITTED",
      "statement": "Passionate about computer science..."
    },
    "statusHistory": [
      {
        "status_id": "1",
        "status": "SUBMITTED",
        "changed_by": "1",
        "changed_by_role": "student",
        "changed_at": "2026-11-12T13:26:05.567Z"
      }
    ],
    "documents": []
  }
}
```

---

### `GET /api/v1/applications/:id/track`
- **Purpose:** Track real-time progress percentage, current step, and milestone timeline.
- **Auth:** Owner Student, Admin, Reviewer.
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Application tracking retrieved successfully",
  "data": {
    "tracking": {
      "application_id": "19",
      "application_number": "APP-2026-00019",
      "current_status": "APPROVED",
      "progress_percentage": 90,
      "next_step": "Congratulations! Your scholarship grant has been approved and queued for disbursement.",
      "documents_count": 1,
      "verified_documents_count": 1,
      "timeline": [
        { "status": "SUBMITTED", "timestamp": "...", "changed_by": "1" },
        { "status": "UNDER_REVIEW", "timestamp": "...", "changed_by": "Dr. Rajesh" },
        { "status": "APPROVED", "timestamp": "...", "changed_by": "Admin" }
      ]
    }
  }
}
```

---

### `PATCH /api/v1/applications/:id`
- **Purpose:** Update permitted application fields (statement, statement of purpose).
- **Auth:** Owner Student only.
- **Lifecycle Rule:** Only permitted in `DRAFT`, `SUBMITTED`, `DOCUMENTS_REQUIRED`, `CORRECTION_REQUIRED`, `RESUBMISSION_REQUIRED`.
- **Request Body:**
```json
{
  "statement": "Updated statement with requested fee clarification."
}
```

---

### `POST /api/v1/applications/:id/withdraw`
- **Purpose:** Withdraw an application before decision.
- **Auth:** Owner Student.
- **Request Body:**
```json
{
  "remarks": "Opting for alternate fellowship."
}
```

---

## 4. Document Endpoints

### `POST /api/v1/applications/:id/documents`
- **Purpose:** Upload document attachment (`multipart/form-data`).
- **Auth:** Owner Student or Admin.
- **Form Data Fields:**
  - `document`: Binary file (PDF, JPEG, PNG, max 10MB)
  - `requirement_id`: Optional requirement mapping
  - `document_name`: Display name (e.g. "Income Certificate")
- **Response (201 Created):**
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "data": {
    "document": {
      "application_document_id": "8",
      "application_id": "19",
      "document_name": "Income Certificate",
      "verification_status": "PENDING",
      "uploaded_at": "2026-11-12T13:26:48.324Z"
    }
  }
}
```

---

### `GET /api/v1/applications/:id/documents/:documentId/download`
- **Purpose:** Securely stream document binary with path-traversal prevention.
- **Auth:** Owner Student, Admin, Reviewer.

---

### `PATCH /api/v1/applications/:id/documents/:documentId/verify`
- **Purpose:** Update document verification status.
- **Auth:** Reviewer or Admin (`role: 'reviewer' | 'admin'`).
- **Request Body:**
```json
{
  "verification_status": "VERIFIED",
  "comment": "Income certificate verified against government revenue records."
}
```

---

## 5. Reviewer & Admin Endpoints

### `PATCH /api/v1/applications/:id/status`
- **Purpose:** Transition application lifecycle status.
- **Auth:** Reviewer or Admin.
- **Request Body:**
```json
{
  "status": "UNDER_REVIEW",
  "comment": "Application accepted for scrutiny."
}
```

---

### `GET /api/v1/applications/admin/all`
- **Purpose:** Paginated list of applications with filters.
- **Auth:** Admin or Reviewer.
- **Query Parameters:** `status`, `scholarship_id`, `page`, `limit`, `sort`.

---

## 6. Internal Microservice Endpoints

Secured by header: `X-Service-Token: <SERVICE_TO_SERVICE_SECRET>`

- `GET /internal/applications/:id`: Retrieve application details for Review Service or Payment Service.
- `GET /internal/applications`: Filter applications by status across services.
- `PATCH /internal/applications/:id/status`: Update status from Review Service (upon decision) or Payment Service (upon disbursement).


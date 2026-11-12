# Application Microservice - Database Design & Ownership

This document details the database architecture, table schemas, relationships, and data partitioning for the **Application Microservice**.

---

## 1. Data Store Strategy (Dual-Storage Pattern)

The service employs a hybrid data architecture:
1. **PostgreSQL (`scholarship_portal`):** System of record for ACID transactions, structured relational querying, status audit history, and foreign keys strictly internal to the microservice.
2. **MongoDB (`scholarship_documents`):** Point-in-time snapshot archive storing flexible submission payloads, application state snapshots, and document verification metadata.

---

## 2. PostgreSQL Schema & Tables

### A. `application` Table
Stores the primary application record.
```sql
CREATE TABLE application (
    application_id     BIGSERIAL PRIMARY KEY,
    application_number VARCHAR(64) UNIQUE,
    student_id         VARCHAR(64) NOT NULL,
    scholarship_id     VARCHAR(64) NOT NULL,
    status             VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED',
    academic_year      VARCHAR(32) DEFAULT '2026-2027',
    statement          TEXT,
    sop                TEXT,
    application_date   DATE DEFAULT CURRENT_DATE,
    submitted_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_by    VARCHAR(100),
    grant_id           BIGINT,
    reviewer_id        BIGINT,
    CONSTRAINT unique_student_scholarship UNIQUE(student_id, scholarship_id)
);
```

#### Indexes:
- `idx_app_student_id ON application(student_id)`
- `idx_app_scholarship_id ON application(scholarship_id)`
- `idx_app_status ON application(status)`
- `idx_app_application_number ON application(application_number)`
- `idx_app_updated_at ON application(updated_at DESC)`

---

### B. `application_status` Table
Append-only audit history of every status transition.
```sql
CREATE TABLE application_status (
    status_id       BIGSERIAL PRIMARY KEY,
    application_id  BIGINT NOT NULL REFERENCES application(application_id) ON DELETE CASCADE,
    status          VARCHAR(50) NOT NULL,
    previous_status VARCHAR(50),
    new_status      VARCHAR(50),
    comment         TEXT,
    remarks         TEXT,
    changed_by      VARCHAR(100) DEFAULT 'SYSTEM',
    changed_by_role VARCHAR(50),
    changed_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Indexes:
- `idx_app_status_app_id ON application_status(application_id)`
- `idx_app_status_changed_at ON application_status(changed_at ASC)`

---

### C. `application_document` Table
Document attachment metadata linked to applications.
```sql
CREATE TABLE application_document (
    application_document_id BIGSERIAL PRIMARY KEY,
    application_id          BIGINT NOT NULL REFERENCES application(application_id) ON DELETE CASCADE,
    requirement_id          BIGINT,
    document_id             BIGINT,
    document_name           VARCHAR(300),
    original_name           VARCHAR(300) NOT NULL,
    document_path           VARCHAR(500) NOT NULL,
    mime_type               VARCHAR(100),
    file_size               BIGINT,
    verification_status     VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                            CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    reviewer_comment        TEXT,
    verified_by             VARCHAR(64),
    verified_at             TIMESTAMP WITH TIME ZONE,
    uploaded_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Indexes:
- `idx_app_doc_app_id ON application_document(application_id)`
- `idx_app_doc_verification ON application_document(verification_status)`

---

### D. `application_idempotency` Table
Guarantees duplicate HTTP request safety.
```sql
CREATE TABLE application_idempotency (
    idempotency_key VARCHAR(128) PRIMARY KEY,
    student_id      VARCHAR(64) NOT NULL,
    request_hash    VARCHAR(128),
    response_status INT NOT NULL,
    response_body   JSONB NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at      TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);
```

---

## 3. MongoDB Collections (`scholarship_documents`)

### `application_snapshots`
- **Purpose:** Preserves the exact submitted state, applicant academic records, and scholarship criteria at submission time.
- **Key Fields:** `application_id`, `application_number`, `student_id`, `scholarship_id`, `scholarship`, `submission_data`, `captured_at`.
- **Indexes:** `{ application_id: 1 }`, `{ student_id: 1 }`.

### `document_metadata`
- **Purpose:** Stores file checksums, storage keys, and audit details.
- **Key Fields:** `document_id`, `originalName`, `storageKey`, `mimeType`, `sizeBytes`, `checksum`, `uploadedAt`.
- **Indexes:** `{ document_id: 1 }`.


# Database Design & Dual-Storage Architecture
**ApexScholar — Online Scholarship Portal**  
**Course:** CS543 Web Services  

---

## 1. Storage Overview

ApexScholar utilizes a **polyglot persistence model** combining relational (PostgreSQL) and document-binary (MongoDB GridFS) storage to separate structured transactional state from unstructured file payloads.

| Database / Store | Technology | Service Owner | Primary Data Managed |
| :--- | :--- | :--- | :--- |
| `identity_db` | PostgreSQL 16 | Identity Student Service | User credentials, roles, student profiles, active sessions. |
| `scholarship_db` | PostgreSQL 16 | Scholarship Service | Scholarship programs, criteria, eligibility rules, funding amounts. |
| `application_db` | PostgreSQL 16 | Application Service | Applications, answers, timeline history, document metadata. |
| `review_db` | PostgreSQL 16 | Review Service | Reviews, evaluator scores, document verification remarks, decisions. |
| `scholarship_documents` | MongoDB GridFS | Application Service | Raw document binaries (PDFs, images) stored in chunked collections. |

---

## 2. PostgreSQL Relational Schemas

### A. Identity Database (`identity_db`)
- `users`: `id (UUID PK)`, `email (UNIQUE)`, `password (bcrypt hash)`, `role ('student' | 'reviewer' | 'admin')`, `created_at`, `updated_at`.
- `user_profiles`: `user_id (FK)`, `first_name`, `last_name`, `phone`, `date_of_birth`, `gender`, `address`.
- `user_sessions`: `id (UUID PK)`, `user_id (FK)`, `refresh_token (hash)`, `ip_address`, `user_agent`, `is_revoked (boolean)`, `expires_at`.

### B. Scholarship Database (`scholarship_db`)
- `scholarships`: `id (SERIAL PK)`, `name`, `description`, `category`, `amount (NUMERIC)`, `deadline (TIMESTAMP)`, `minimum_gpa (NUMERIC)`, `family_income_limit (NUMERIC)`, `status ('open' | 'closed' | 'archived')`, `created_at`.
- `scholarship_criteria`: `id (SERIAL PK)`, `scholarship_id (FK)`, `field_name`, `operator`, `threshold_value`.

### C. Application Database (`application_db`)
- `applications`: `id (UUID PK)`, `application_number (VARCHAR)`, `student_id (UUID)`, `scholarship_id (VARCHAR)`, `status ('DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED' | 'WITHDRAWN')`, `submitted_at`, `created_at`.
- `application_documents`: `id (UUID PK)`, `application_id (FK)`, `uploaded_by_user_id (UUID)`, `original_filename`, `file_size`, `mime_type`, `gridfs_id (VARCHAR)`, `storage_path`, `storage_provider ('gridfs' | 'local')`, `checksum`, `verification_status ('PENDING' | 'VERIFIED' | 'REJECTED')`, `is_current (boolean)`.
- `application_status_history`: `id (UUID PK)`, `application_id (FK)`, `from_status`, `to_status`, `changed_by_user_id`, `remarks`, `created_at`.
- `application_form_answers`: `id (UUID PK)`, `application_id (FK)`, `answers (JSONB)`.

### D. Review Database (`review_db`)
- `reviews`: `id (SERIAL PK)`, `application_id (VARCHAR UNIQUE)`, `student_id (VARCHAR)`, `scholarship_id (VARCHAR)`, `reviewer_id (VARCHAR)`, `score (INTEGER)`, `comments`, `status ('UNDER_REVIEW' | 'APPROVED' | 'REJECTED')`, `created_at`.
- `review_decisions`: `id (SERIAL PK)`, `application_id (VARCHAR)`, `decision ('ACCEPTED' | 'REJECTED')`, `admin_id (VARCHAR)`, `notes`, `created_at`.

---

## 3. MongoDB GridFS Architecture

### GridFS Storage Mechanism
GridFS stores large binary files by partitioning them into two collections:
1. **`documents.files`:** Metadata collection recording:
   - `_id`: Unique ObjectID
   - `filename`: Original file name
   - `length`: File size in bytes
   - `chunkSize`: Standard chunk size (typically 255 KB)
   - `uploadDate`: Ingestion timestamp
   - `metadata`: Application UUID, student UUID, checksum, MIME type.
2. **`documents.chunks`:** Binary chunks collection:
   - `_id`: Chunk ObjectID
   - `files_id`: Reference to parent `_id` in `documents.files`
   - `n`: Chunk index sequence
   - `data`: Binary BSON buffer.

### High Availability Dual-Storage Fallback Strategy
```
                     +----------------------------+
                     | Incoming File (PDF/PNG/JPG)|
                     +--------------+-------------+
                                    |
                                    v
                     +----------------------------+
                     | Server Magic-Byte Validation|
                     +--------------+-------------+
                                    |
                 +------------------+------------------+
                 | [Primary Engine]                    | [Fallback Engine]
                 v                                     v
       +--------------------+               +--------------------+
       | MongoDB Connected? |               | Local Disk Storage |
       +---------+----------+               |  uploads/ directory|
                 |                          +---------+----------+
        YES /    \ NO (Timeout / Down)                |
       +---v-+    +-----------------------------------v---+
       | Store in GridFS |                   | Write to Disk      |
       | storage_provider|                   | storage_provider   |
       | = 'gridfs'      |                   | = 'local'          |
       +---------+-------+                   +--------+-----------+
                 |                                    |
                 +-----------------+------------------+
                                   |
                                   v
                   +-------------------------------+
                   | Insert Metadata Record into   |
                   | PostgreSQL application_documents|
                   +-------------------------------+
```

---

## 4. Database Isolation & Integrity Guarantees

1. **No Shared Connections:** Microservices strictly isolate their database connection pools. No service queries tables belonging to another domain.
2. **ACID Relational Guarantees:** Application status transitions, status histories, and document metadata inserts are executed within transactional boundaries in PostgreSQL.
3. **Storage Non-Orphaning:** If a database transaction fails during document upload, any partially written GridFS chunks are removed via cleanup logic to prevent orphaned binary data.

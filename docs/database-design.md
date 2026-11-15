# ApexScholar Database Design Documentation

ApexScholar adheres strictly to the **Database-per-Service** design pattern. No microservice shares its database connection or tables with any other service.

---

## 1. Identity Service Database (`identity_db`)

- **Host**: `localhost:5432`
- **Engine**: PostgreSQL 18
- **Primary Tables**:
  - `users`: User identity, credential hash (bcrypt), role (`student`, `reviewer`, `admin`), account status.
  - `student_profiles`: Academic details, enrollment number, department, course, admission year, profile completeness percentage.
  - `user_sessions`: Active refresh token hashes, session expirations, revocation tracking.
  - `password_reset_tokens`: SHA-256 tokens with short TTLs for password recovery.
  - `email_verification_tokens`: Verification codes for student identity activation.
  - `student_addresses`: Permanent and correspondence postal addresses.
  - `user_audit_logs`: Audit trail recording IP address, action code, and timestamp.

---

## 2. Scholarship Service Database (`scholarship_db`)

- **Host**: `localhost:5432`
- **Engine**: PostgreSQL 18
- **Primary Tables**:
  - `scholarships`: Core scholarship definition (`id` UUID, `name`, `description`, `category`, `amount`, `min_cgpa`, `max_income`, `department`, `deadline`, `total_slots`, `status`, `eligibility_criteria`, `required_documents`).
  - Indexes: `idx_scholarships_status`, `idx_scholarships_category`, `idx_scholarships_created_at`.

---

## 3. Application Service Database (`application_db`) & Document Storage

- **Host**: `localhost:5432` (PostgreSQL) & `127.0.0.1:27017` (MongoDB)
- **Engine**: PostgreSQL 18 + MongoDB GridFS
- **Primary Tables (PostgreSQL)**:
  - `applications`: Application UUID, scholarship foreign key reference, student reference, submission timestamp, current state (`DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`).
  - `application_form_answers`: Serialized question-answer pairs submitted by the student.
  - `application_documents`: Metadata record of uploaded files (`original_filename`, `storage_key`, `gridfs_id`, `mime_type`, `file_size_bytes`, `checksum_sha256`, `verification_status`).
  - `application_status_history`: Immutable state transition log.
  - `application_audit_logs`: Comprehensive audit events for compliance.
- **MongoDB GridFS (`scholarship_documents`)**:
  - Collection: `documents.files` (Document headers, MIME type, upload timestamps).
  - Collection: `documents.chunks` (Chunked binary streams of PDFs, JPEGs, PNGs).

---

## 4. Review Service Database (`review_db`)

- **Host**: `localhost:5432`
- **Engine**: PostgreSQL 18
- **Primary Tables**:
  - `reviews`: Scrutiny record mapping `application_id`, `student_id`, `scholarship_id`, reviewer assignment, verification state (`PENDING`, `DOCUMENTS_UNDER_REVIEW`, `ELIGIBILITY_VERIFIED`, `APPROVED`, `REJECTED`), and document statuses.
  - `review_history`: Timeline of reviewer actions, comments, and decision timestamps.
  - Indexes: `idx_reviews_student_id`, `idx_reviews_status`, `idx_reviews_callback_status`.

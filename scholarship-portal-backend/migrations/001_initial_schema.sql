-- Online Scholarship Portal - PostgreSQL Migration
-- Database: scholarship_portal
-- Schema: portal

CREATE SCHEMA IF NOT EXISTS portal;

-- ============================================================
-- 1. STUDENT
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.student (
    student_id      SERIAL PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    phone           VARCHAR(20),
    date_of_birth   DATE,
    gender          VARCHAR(20),
    address         TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_email ON portal.student(email);

-- ============================================================
-- 2. STUDENT PROFILE
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.student_profile (
    profile_id      SERIAL PRIMARY KEY,
    student_id      INTEGER NOT NULL UNIQUE REFERENCES portal.student(student_id) ON DELETE CASCADE,
    category        VARCHAR(50),
    annual_income   NUMERIC(12, 2),
    family_size     INTEGER,
    state           VARCHAR(100),
    city            VARCHAR(100)
);

-- ============================================================
-- 3. ACADEMIC DETAILS
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.academic_details (
    academic_id     SERIAL PRIMARY KEY,
    student_id      INTEGER NOT NULL REFERENCES portal.student(student_id) ON DELETE CASCADE,
    institution_name VARCHAR(300),
    course          VARCHAR(100),
    branch          VARCHAR(100),
    semester        INTEGER CHECK (semester >= 1 AND semester <= 12),
    cgpa            NUMERIC(4, 2) CHECK (cgpa >= 0.0 AND cgpa <= 10.0),
    passing_year    INTEGER CHECK (passing_year >= 1990 AND passing_year <= 2040)
);

CREATE INDEX IF NOT EXISTS idx_academic_student ON portal.academic_details(student_id);

-- ============================================================
-- 4. SCHOLARSHIP
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.scholarship (
    scholarship_id  SERIAL PRIMARY KEY,
    name            VARCHAR(300)    NOT NULL,
    description     TEXT,
    amount          NUMERIC(12, 2)  NOT NULL CHECK (amount > 0),
    status          VARCHAR(20)     NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'DRAFT')),
    deadline        DATE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scholarship_status ON portal.scholarship(status);

-- ============================================================
-- 5. ELIGIBILITY CRITERIA
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.eligibility_criteria (
    criteria_id     SERIAL PRIMARY KEY,
    scholarship_id  INTEGER NOT NULL REFERENCES portal.scholarship(scholarship_id) ON DELETE CASCADE,
    minimum_cgpa    NUMERIC(4, 2) CHECK (minimum_cgpa >= 0 AND minimum_cgpa <= 10),
    maximum_income  NUMERIC(12, 2),
    eligible_course VARCHAR(100),
    eligible_category VARCHAR(50),
    minimum_age     INTEGER CHECK (minimum_age >= 0),
    maximum_age     INTEGER CHECK (maximum_age >= 0),
    UNIQUE(scholarship_id)
);

-- ============================================================
-- 6. REQUIRED DOCUMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.required_document (
    requirement_id  SERIAL PRIMARY KEY,
    scholarship_id  INTEGER NOT NULL REFERENCES portal.scholarship(scholarship_id) ON DELETE CASCADE,
    document_name   VARCHAR(200)    NOT NULL,
    mandatory       BOOLEAN         NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_required_doc_scholarship ON portal.required_document(scholarship_id);

-- ============================================================
-- 7. REVIEWER
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.reviewer (
    reviewer_id     SERIAL PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    department      VARCHAR(200),
    designation     VARCHAR(200)    NOT NULL,
    status          VARCHAR(20)     DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 8. APPLICATION
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.application (
    application_id  SERIAL PRIMARY KEY,
    student_id      INTEGER NOT NULL REFERENCES portal.student(student_id) ON DELETE CASCADE,
    scholarship_id  INTEGER NOT NULL REFERENCES portal.scholarship(scholarship_id) ON DELETE CASCADE,
    reviewer_id     INTEGER REFERENCES portal.reviewer(reviewer_id),
    status          VARCHAR(30)     NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT','SUBMITTED','UNDER_REVIEW','CORRECTION_REQUIRED','APPROVED','REJECTED')),
    application_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    submitted_at    TIMESTAMP WITH TIME ZONE,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, scholarship_id)
);

CREATE INDEX IF NOT EXISTS idx_application_student ON portal.application(student_id);
CREATE INDEX IF NOT EXISTS idx_application_scholarship ON portal.application(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_application_status ON portal.application(status);

-- ============================================================
-- 9. APPLICATION DOCUMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.application_document (
    application_document_id SERIAL PRIMARY KEY,
    application_id  INTEGER NOT NULL REFERENCES portal.application(application_id) ON DELETE CASCADE,
    requirement_id  INTEGER NOT NULL REFERENCES portal.required_document(requirement_id),
    document_path   VARCHAR(500)    NOT NULL,
    original_name   VARCHAR(300),
    mime_type       VARCHAR(100),
    file_size       INTEGER,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (verification_status IN ('PENDING','VERIFIED','REJECTED')),
    reviewer_comment TEXT,
    verified_by     INTEGER REFERENCES portal.reviewer(reviewer_id),
    verified_at     TIMESTAMP WITH TIME ZONE,
    uploaded_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_doc_application ON portal.application_document(application_id);

-- ============================================================
-- 10. APPLICATION STATUS (History)
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.application_status (
    status_id       SERIAL PRIMARY KEY,
    application_id  INTEGER NOT NULL REFERENCES portal.application(application_id) ON DELETE CASCADE,
    status          VARCHAR(30)     NOT NULL,
    comment         TEXT,
    changed_by      VARCHAR(100),
    changed_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_status_application ON portal.application_status(application_id);

-- ============================================================
-- 11. PAYMENT
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.payment (
    payment_id      SERIAL PRIMARY KEY,
    application_id  INTEGER NOT NULL REFERENCES portal.application(application_id) ON DELETE CASCADE,
    amount          NUMERIC(12, 2)  NOT NULL CHECK (amount > 0),
    payment_status  VARCHAR(20)     NOT NULL DEFAULT 'PENDING'
                    CHECK (payment_status IN ('PENDING','PROCESSING','SUCCESS','FAILED')),
    transaction_id  VARCHAR(100)    NOT NULL UNIQUE,
    payment_date    TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_application ON portal.payment(application_id);

-- ============================================================
-- 12. IDEMPOTENCY KEY
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.idempotency_key (
    key_id          SERIAL PRIMARY KEY,
    idempotency_key VARCHAR(255)    NOT NULL UNIQUE,
    request_hash    VARCHAR(64),
    response_body   JSONB,
    status_code     INTEGER,
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expiry ON portal.idempotency_key(expires_at);

-- ============================================================
-- 13. NOTIFICATION
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.notification (
    notification_id SERIAL PRIMARY KEY,
    student_id      INTEGER NOT NULL REFERENCES portal.student(student_id) ON DELETE CASCADE,
    title           VARCHAR(300)    NOT NULL,
    message         TEXT            NOT NULL,
    type            VARCHAR(30)     DEFAULT 'INFO',
    is_read         BOOLEAN         DEFAULT FALSE,
    reference_type  VARCHAR(50),
    reference_id    INTEGER,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_student ON portal.notification(student_id);

-- ============================================================
-- 14. ADMIN (for admin login)
-- ============================================================
CREATE TABLE IF NOT EXISTS portal.admin (
    admin_id        SERIAL PRIMARY KEY,
    name            VARCHAR(200)    NOT NULL,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    role            VARCHAR(50)     NOT NULL DEFAULT 'ADMIN',
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application Microservice Safe Database Migration
-- Preserves existing tables, columns, and data while ensuring required schema structures.

-- 1. Applications Table
CREATE TABLE IF NOT EXISTS application (
    application_id  BIGSERIAL PRIMARY KEY,
    student_id      BIGINT NOT NULL,
    scholarship_id  BIGINT NOT NULL,
    reviewer_id     BIGINT,
    grant_id        BIGINT,
    status          VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED'
                    CHECK (status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED', 'DISBURSED')),
    application_date DATE DEFAULT CURRENT_DATE,
    submitted_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    statement       TEXT,
    sop             TEXT,
    CONSTRAINT unique_student_scholarship UNIQUE(student_id, scholarship_id)
);

-- Safely add columns if the table pre-existed with older schema
ALTER TABLE application ADD COLUMN IF NOT EXISTS grant_id BIGINT;
ALTER TABLE application ADD COLUMN IF NOT EXISTS reviewer_id BIGINT;
ALTER TABLE application ADD COLUMN IF NOT EXISTS statement TEXT;
ALTER TABLE application ADD COLUMN IF NOT EXISTS sop TEXT;
ALTER TABLE application ADD COLUMN IF NOT EXISTS application_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE application ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE application ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_app_student_id ON application(student_id);
CREATE INDEX IF NOT EXISTS idx_app_scholarship_id ON application(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_app_status ON application(status);
CREATE INDEX IF NOT EXISTS idx_app_updated_at ON application(updated_at DESC);

-- 2. Application Status History Table
CREATE TABLE IF NOT EXISTS application_status (
    status_id       BIGSERIAL PRIMARY KEY,
    application_id  BIGINT NOT NULL REFERENCES application(application_id) ON DELETE CASCADE,
    status          VARCHAR(30) NOT NULL,
    comment         TEXT,
    changed_by      VARCHAR(100) DEFAULT 'SYSTEM',
    changed_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE application_status ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE application_status ADD COLUMN IF NOT EXISTS changed_by VARCHAR(100) DEFAULT 'SYSTEM';
ALTER TABLE application_status ADD COLUMN IF NOT EXISTS changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_app_status_app_id ON application_status(application_id);
CREATE INDEX IF NOT EXISTS idx_app_status_changed_at ON application_status(changed_at ASC);

-- 3. Application Documents Table
CREATE TABLE IF NOT EXISTS application_document (
    application_document_id BIGSERIAL PRIMARY KEY,
    application_id  BIGINT NOT NULL REFERENCES application(application_id) ON DELETE CASCADE,
    requirement_id  BIGINT,
    document_id     BIGINT,
    document_name   VARCHAR(300),
    original_name   VARCHAR(300) NOT NULL,
    document_path   VARCHAR(500) NOT NULL,
    mime_type       VARCHAR(100),
    file_size       BIGINT,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                    CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    reviewer_comment TEXT,
    verified_by     BIGINT,
    verified_at     TIMESTAMP WITH TIME ZONE,
    uploaded_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE application_document ADD COLUMN IF NOT EXISTS document_id BIGINT;
ALTER TABLE application_document ADD COLUMN IF NOT EXISTS document_name VARCHAR(300);
ALTER TABLE application_document ADD COLUMN IF NOT EXISTS original_name VARCHAR(300);
ALTER TABLE application_document ADD COLUMN IF NOT EXISTS document_path VARCHAR(500);
ALTER TABLE application_document ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE application_document ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE application_document ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE application_document ADD COLUMN IF NOT EXISTS reviewer_comment TEXT;
ALTER TABLE application_document ADD COLUMN IF NOT EXISTS verified_by BIGINT;
ALTER TABLE application_document ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE application_document ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_app_doc_app_id ON application_document(application_id);
CREATE INDEX IF NOT EXISTS idx_app_doc_verification ON application_document(verification_status);


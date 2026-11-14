-- Migration 003: Complete Independent Application Service Schema
-- Targets database: application_db (PostgreSQL)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Applications Table
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_number VARCHAR(64) NOT NULL UNIQUE,
    student_id VARCHAR(64) NOT NULL,
    scholarship_id VARCHAR(64) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN (
            'DRAFT',
            'SUBMITTED',
            'UNDER_REVIEW',
            'DOCUMENTS_REQUIRED',
            'RESUBMISSION_REQUIRED',
            'CORRECTION_REQUIRED',
            'APPROVED',
            'REJECTED',
            'PAYMENT_PENDING',
            'COMPLETED',
            'DISBURSED',
            'WITHDRAWN'
        )),
    academic_year VARCHAR(32) DEFAULT '2026-2027',
    statement TEXT,
    sop TEXT,
    form_schema_version VARCHAR(32) DEFAULT '1.0',
    metadata JSONB DEFAULT '{}'::jsonb,
    submitted_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_student_scholarship UNIQUE(student_id, scholarship_id)
);

-- Safely alter column types to VARCHAR(64) if they were created as UUID
ALTER TABLE applications ALTER COLUMN student_id TYPE VARCHAR(64) USING student_id::text;
ALTER TABLE applications ALTER COLUMN scholarship_id TYPE VARCHAR(64) USING scholarship_id::text;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS statement TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS sop TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS academic_year VARCHAR(32) DEFAULT '2026-2027';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Ensure applications_status_check includes all microservice lifecycle statuses
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT applications_status_check CHECK (status IN (
    'DRAFT',
    'SUBMITTED',
    'UNDER_REVIEW',
    'DOCUMENTS_REQUIRED',
    'RESUBMISSION_REQUIRED',
    'CORRECTION_REQUIRED',
    'APPROVED',
    'REJECTED',
    'PAYMENT_PENDING',
    'COMPLETED',
    'DISBURSED',
    'WITHDRAWN'
));
ALTER TABLE applications ADD COLUMN IF NOT EXISTS form_schema_version VARCHAR(32) DEFAULT '1.0';

CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_scholarship_id ON applications(scholarship_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_app_num ON applications(application_number);
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);

-- 2. Dynamic Form Answers Table
CREATE TABLE IF NOT EXISTS application_form_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    section_key VARCHAR(100),
    question_key VARCHAR(100) NOT NULL,
    question_label VARCHAR(255),
    answer_value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_app_question UNIQUE(application_id, question_key)
);

CREATE INDEX IF NOT EXISTS idx_form_answers_app_id ON application_form_answers(application_id);
CREATE INDEX IF NOT EXISTS idx_form_answers_question_key ON application_form_answers(question_key);

-- 3. Document Requirements Snapshot Table
CREATE TABLE IF NOT EXISTS application_document_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    requirement_code VARCHAR(100) NOT NULL,
    requirement_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    allowed_mime_types JSONB DEFAULT '["application/pdf", "image/jpeg", "image/png"]'::jsonb,
    max_file_size_bytes BIGINT DEFAULT 10485760,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_reqs_app_id ON application_document_requirements(application_id);

-- 4. Uploaded Documents Table
CREATE TABLE IF NOT EXISTS application_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    requirement_id UUID REFERENCES application_document_requirements(id) ON DELETE SET NULL,
    uploaded_by_user_id VARCHAR(64) NOT NULL,
    document_type VARCHAR(100),
    original_filename VARCHAR(300) NOT NULL,
    storage_key TEXT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(128),
    verification_status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
        CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    remarks TEXT,
    is_current BOOLEAN NOT NULL DEFAULT true,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely alter column types to VARCHAR(64) if they were created as UUID
ALTER TABLE application_documents ALTER COLUMN uploaded_by_user_id TYPE VARCHAR(64) USING uploaded_by_user_id::text;
ALTER TABLE application_documents ALTER COLUMN requirement_id DROP NOT NULL;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS document_type VARCHAR(100);
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS verification_status VARCHAR(30) DEFAULT 'PENDING';
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_app_documents_app_id ON application_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_app_documents_user_id ON application_documents(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_app_documents_is_current ON application_documents(is_current);

-- 5. Application Status History Table
CREATE TABLE IF NOT EXISTS application_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by_user_id VARCHAR(64),
    changed_by_role VARCHAR(50),
    reason TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE application_status_history ALTER COLUMN changed_by_user_id TYPE VARCHAR(64) USING changed_by_user_id::text;
CREATE INDEX IF NOT EXISTS idx_status_history_app_id ON application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON application_status_history(changed_at ASC);

-- Ensure application_status_history check constraints allow all lifecycle statuses
ALTER TABLE application_status_history DROP CONSTRAINT IF EXISTS valid_previous_status;
ALTER TABLE application_status_history DROP CONSTRAINT IF EXISTS valid_new_status;
ALTER TABLE application_status_history ADD CONSTRAINT valid_previous_status CHECK (
    previous_status IS NULL OR previous_status IN (
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED',
        'RESUBMISSION_REQUIRED', 'CORRECTION_REQUIRED', 'APPROVED',
        'REJECTED', 'PAYMENT_PENDING', 'COMPLETED', 'DISBURSED', 'WITHDRAWN'
    )
);
ALTER TABLE application_status_history ADD CONSTRAINT valid_new_status CHECK (
    new_status IN (
        'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'DOCUMENTS_REQUIRED',
        'RESUBMISSION_REQUIRED', 'CORRECTION_REQUIRED', 'APPROVED',
        'REJECTED', 'PAYMENT_PENDING', 'COMPLETED', 'DISBURSED', 'WITHDRAWN'
    )
);

-- 6. Application Audit Logs Table
CREATE TABLE IF NOT EXISTS application_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    actor_user_id VARCHAR(64),
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE application_audit_logs ALTER COLUMN actor_user_id TYPE VARCHAR(64) USING actor_user_id::text;
CREATE INDEX IF NOT EXISTS idx_audit_logs_app_id ON application_audit_logs(application_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON application_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON application_audit_logs(created_at DESC);

-- 7. Outbox Events Table
CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    attempts INT NOT NULL DEFAULT 0,
    last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_unpublished ON outbox_events(published_at) WHERE published_at IS NULL;

-- 8. Idempotency Keys Table
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    user_id VARCHAR(64) NOT NULL,
    request_hash VARCHAR(128) NOT NULL,
    response_status INT,
    response_body JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE idempotency_keys ALTER COLUMN user_id TYPE VARCHAR(64) USING user_id::text;
CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_keys(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

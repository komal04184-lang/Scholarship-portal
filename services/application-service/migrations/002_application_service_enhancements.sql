-- Migration 002: Application Service Enhancements
-- Adds idempotency, application_number, academic_year, and expanded status fields

-- 1. Enhance application table
ALTER TABLE application ADD COLUMN IF NOT EXISTS application_number VARCHAR(64);
ALTER TABLE application ADD COLUMN IF NOT EXISTS academic_year VARCHAR(32) DEFAULT '2026-2027';
ALTER TABLE application ADD COLUMN IF NOT EXISTS last_updated_by VARCHAR(100);

-- Backfill application_number for existing records if NULL
UPDATE application 
SET application_number = 'APP-' || COALESCE(TO_CHAR(submitted_at, 'YYYY'), '2026') || '-' || LPAD(application_id::TEXT, 5, '0')
WHERE application_number IS NULL;

-- Create unique index on application_number
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_application_number ON application(application_number);

-- 2. Relax status check constraint on application to accommodate full microservices lifecycle
DO $$
BEGIN
    ALTER TABLE application DROP CONSTRAINT IF EXISTS application_status_check;
    ALTER TABLE application ADD CONSTRAINT application_status_check CHECK (
        status IN (
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
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. Enhance application_status table
ALTER TABLE application_status ADD COLUMN IF NOT EXISTS previous_status VARCHAR(50);
ALTER TABLE application_status ADD COLUMN IF NOT EXISTS new_status VARCHAR(50);
ALTER TABLE application_status ADD COLUMN IF NOT EXISTS changed_by_role VARCHAR(50);
ALTER TABLE application_status ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Backfill new_status and remarks from status and comment
UPDATE application_status 
SET new_status = status, remarks = comment 
WHERE new_status IS NULL;

-- 4. Idempotency Support Table
CREATE TABLE IF NOT EXISTS application_idempotency (
    idempotency_key   VARCHAR(128) PRIMARY KEY,
    student_id        VARCHAR(64) NOT NULL,
    request_hash      VARCHAR(128),
    response_status   INT NOT NULL,
    response_body     JSONB NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at        TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON application_idempotency(expires_at);


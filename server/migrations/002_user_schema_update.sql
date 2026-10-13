-- Migration: 002_user_schema_update.sql
-- Aligns PostgreSQL schema with User ER Model & Website Data Needs

CREATE SCHEMA IF NOT EXISTS portal;
SET search_path TO portal, public;

-- 1. Student
ALTER TABLE IF EXISTS portal.student ADD COLUMN IF NOT EXISTS password VARCHAR(255);
UPDATE portal.student SET password = password_hash WHERE password IS NULL AND password_hash IS NOT NULL;

-- 2. Student Profile (Matches user specification)

-- 3. Academic Details (Matches user specification)

-- 4. Scholarship (Add deadline if not present)
ALTER TABLE IF EXISTS portal.scholarship ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE IF EXISTS portal.scholarship ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Eligibility Criteria (Matches user specification)

-- 6. Required Document (Matches user specification)

-- 7. Reviewer
ALTER TABLE IF EXISTS portal.reviewer ADD COLUMN IF NOT EXISTS password VARCHAR(255);
UPDATE portal.reviewer SET password = password_hash WHERE password IS NULL AND password_hash IS NOT NULL;

-- 8. Grant Record (Table 8 in user's diagram)
CREATE TABLE IF NOT EXISTS portal.grant_record (
    grant_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    scholarship_id BIGINT REFERENCES portal.scholarship(scholarship_id) ON DELETE SET NULL,
    grant_name VARCHAR(150),
    amount NUMERIC(12,2),
    status VARCHAR(30) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Application (Add grant_id, statement, sop)
ALTER TABLE IF EXISTS portal.application ADD COLUMN IF NOT EXISTS grant_id BIGINT REFERENCES portal.grant_record(grant_id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS portal.application ADD COLUMN IF NOT EXISTS statement TEXT;
ALTER TABLE IF EXISTS portal.application ADD COLUMN IF NOT EXISTS sop TEXT;

-- 10. Application Status History (Ensure changed_by exists)
ALTER TABLE IF EXISTS portal.application_status ADD COLUMN IF NOT EXISTS changed_by VARCHAR(100) DEFAULT 'SYSTEM';

-- 11. Application Document (Ensure document_id and file storage columns exist)
ALTER TABLE IF EXISTS portal.application_document ADD COLUMN IF NOT EXISTS document_id BIGINT;
UPDATE portal.application_document SET document_id = requirement_id WHERE document_id IS NULL AND requirement_id IS NOT NULL;
ALTER TABLE IF EXISTS portal.application_document ADD COLUMN IF NOT EXISTS document_path VARCHAR(500);
ALTER TABLE IF EXISTS portal.application_document ADD COLUMN IF NOT EXISTS original_name VARCHAR(300);
ALTER TABLE IF EXISTS portal.application_document ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE IF EXISTS portal.application_document ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE IF EXISTS portal.application_document ADD COLUMN IF NOT EXISTS verified_by BIGINT REFERENCES portal.reviewer(reviewer_id);

-- 12. Payment (Ensure transaction_reference and status exist)
ALTER TABLE IF EXISTS portal.payment ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(150);
UPDATE portal.payment SET transaction_reference = transaction_id WHERE transaction_reference IS NULL AND transaction_id IS NOT NULL;
ALTER TABLE IF EXISTS portal.payment ADD COLUMN IF NOT EXISTS status VARCHAR(30);
UPDATE portal.payment SET status = payment_status WHERE status IS NULL AND payment_status IS NOT NULL;

-- Expose views in public schema so both 'student' and 'portal.student' work identically
CREATE OR REPLACE VIEW public.student AS SELECT * FROM portal.student;
CREATE OR REPLACE VIEW public.student_profile AS SELECT * FROM portal.student_profile;
CREATE OR REPLACE VIEW public.academic_details AS SELECT * FROM portal.academic_details;
CREATE OR REPLACE VIEW public.scholarship AS SELECT * FROM portal.scholarship;
CREATE OR REPLACE VIEW public.eligibility_criteria AS SELECT * FROM portal.eligibility_criteria;
CREATE OR REPLACE VIEW public.required_document AS SELECT * FROM portal.required_document;
CREATE OR REPLACE VIEW public.reviewer AS SELECT * FROM portal.reviewer;
CREATE OR REPLACE VIEW public.grant_record AS SELECT * FROM portal.grant_record;
CREATE OR REPLACE VIEW public.application AS SELECT * FROM portal.application;
CREATE OR REPLACE VIEW public.application_status AS SELECT * FROM portal.application_status;
CREATE OR REPLACE VIEW public.application_document AS SELECT * FROM portal.application_document;
CREATE OR REPLACE VIEW public.payment AS SELECT * FROM portal.payment;

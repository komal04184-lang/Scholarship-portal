--
-- PostgreSQL database dump
--

\restrict nWg5DfJMS4YjjuPv5fxyMYEdp0frhqotQjQCJxYLhLVbrdHcqJs2Gc03vk1GCbS

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: application_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.application_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid,
    actor_user_id character varying(64),
    actor_role character varying(50),
    action character varying(100) NOT NULL,
    description text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: application_document_requirements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.application_document_requirements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    requirement_code character varying(100) NOT NULL,
    requirement_name character varying(255) NOT NULL,
    description text,
    is_mandatory boolean DEFAULT true NOT NULL,
    allowed_mime_types jsonb,
    max_file_size_bytes bigint,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT valid_max_file_size CHECK (((max_file_size_bytes IS NULL) OR (max_file_size_bytes > 0)))
);


--
-- Name: application_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.application_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    requirement_id uuid,
    uploaded_by_user_id character varying(64) NOT NULL,
    original_filename character varying(255) NOT NULL,
    storage_key text NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size_bytes bigint NOT NULL,
    checksum_sha256 character varying(64),
    is_current boolean DEFAULT true NOT NULL,
    uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    document_type character varying(100),
    verification_status character varying(30) DEFAULT 'PENDING'::character varying,
    remarks text,
    CONSTRAINT valid_document_size CHECK ((file_size_bytes > 0))
);


--
-- Name: application_form_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.application_form_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    section_key character varying(100),
    question_key character varying(150) NOT NULL,
    question_label character varying(255),
    answer_value jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: application_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.application_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_id uuid NOT NULL,
    previous_status character varying(30),
    new_status character varying(30) NOT NULL,
    changed_by_user_id character varying(64),
    changed_by_role character varying(50),
    reason text,
    changed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT valid_new_status CHECK (((new_status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'UNDER_REVIEW'::character varying, 'DOCUMENTS_REQUIRED'::character varying, 'RESUBMISSION_REQUIRED'::character varying, 'CORRECTION_REQUIRED'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'PAYMENT_PENDING'::character varying, 'COMPLETED'::character varying, 'DISBURSED'::character varying, 'WITHDRAWN'::character varying])::text[]))),
    CONSTRAINT valid_previous_status CHECK (((previous_status IS NULL) OR ((previous_status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'UNDER_REVIEW'::character varying, 'DOCUMENTS_REQUIRED'::character varying, 'RESUBMISSION_REQUIRED'::character varying, 'CORRECTION_REQUIRED'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'PAYMENT_PENDING'::character varying, 'COMPLETED'::character varying, 'DISBURSED'::character varying, 'WITHDRAWN'::character varying])::text[]))))
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    application_number character varying(50) NOT NULL,
    student_id character varying(64) NOT NULL,
    scholarship_id character varying(64) NOT NULL,
    status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    form_schema_version character varying(50),
    submitted_at timestamp with time zone,
    withdrawn_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    statement text,
    sop text,
    academic_year character varying(32) DEFAULT '2026-2027'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT applications_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'UNDER_REVIEW'::character varying, 'DOCUMENTS_REQUIRED'::character varying, 'RESUBMISSION_REQUIRED'::character varying, 'CORRECTION_REQUIRED'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'PAYMENT_PENDING'::character varying, 'COMPLETED'::character varying, 'DISBURSED'::character varying, 'WITHDRAWN'::character varying])::text[])))
);


--
-- Name: idempotency_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.idempotency_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idempotency_key character varying(255) NOT NULL,
    user_id character varying(64) NOT NULL,
    request_hash character varying(64) NOT NULL,
    response_status integer,
    response_body jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    CONSTRAINT valid_idempotency_expiry CHECK ((expires_at > created_at))
);


--
-- Name: outbox_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aggregate_type character varying(100) NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type character varying(150) NOT NULL,
    payload jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    published_at timestamp with time zone,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    CONSTRAINT valid_event_attempts CHECK ((attempts >= 0))
);


--
-- Name: application_audit_logs application_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_audit_logs
    ADD CONSTRAINT application_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: application_document_requirements application_document_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_document_requirements
    ADD CONSTRAINT application_document_requirements_pkey PRIMARY KEY (id);


--
-- Name: application_documents application_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT application_documents_pkey PRIMARY KEY (id);


--
-- Name: application_documents application_documents_storage_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT application_documents_storage_key_key UNIQUE (storage_key);


--
-- Name: application_form_answers application_form_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_form_answers
    ADD CONSTRAINT application_form_answers_pkey PRIMARY KEY (id);


--
-- Name: application_status_history application_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_status_history
    ADD CONSTRAINT application_status_history_pkey PRIMARY KEY (id);


--
-- Name: applications applications_application_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_application_number_key UNIQUE (application_number);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: idempotency_keys idempotency_keys_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: idempotency_keys idempotency_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.idempotency_keys
    ADD CONSTRAINT idempotency_keys_pkey PRIMARY KEY (id);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- Name: application_form_answers unique_application_question; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_form_answers
    ADD CONSTRAINT unique_application_question UNIQUE (application_id, question_key);


--
-- Name: application_document_requirements unique_application_requirement; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_document_requirements
    ADD CONSTRAINT unique_application_requirement UNIQUE (application_id, requirement_code);


--
-- Name: application_document_requirements unique_requirement_application_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_document_requirements
    ADD CONSTRAINT unique_requirement_application_pair UNIQUE (id, application_id);


--
-- Name: applications unique_student_scholarship; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT unique_student_scholarship UNIQUE (student_id, scholarship_id);


--
-- Name: idx_app_documents_app_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_documents_app_id ON public.application_documents USING btree (application_id);


--
-- Name: idx_app_documents_is_current; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_documents_is_current ON public.application_documents USING btree (is_current);


--
-- Name: idx_app_documents_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_documents_user_id ON public.application_documents USING btree (uploaded_by_user_id);


--
-- Name: idx_applications_app_num; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_app_num ON public.applications USING btree (application_number);


--
-- Name: idx_applications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_created_at ON public.applications USING btree (created_at);


--
-- Name: idx_applications_scholarship; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_scholarship ON public.applications USING btree (scholarship_id);


--
-- Name: idx_applications_scholarship_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_scholarship_id ON public.applications USING btree (scholarship_id);


--
-- Name: idx_applications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_status ON public.applications USING btree (status);


--
-- Name: idx_applications_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_student ON public.applications USING btree (student_id);


--
-- Name: idx_applications_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_student_id ON public.applications USING btree (student_id);


--
-- Name: idx_audit_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_actor ON public.application_audit_logs USING btree (actor_user_id);


--
-- Name: idx_audit_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_application ON public.application_audit_logs USING btree (application_id);


--
-- Name: idx_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_created_at ON public.application_audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_actor ON public.application_audit_logs USING btree (actor_user_id);


--
-- Name: idx_audit_logs_app_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_app_id ON public.application_audit_logs USING btree (application_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.application_audit_logs USING btree (created_at DESC);


--
-- Name: idx_doc_reqs_app_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doc_reqs_app_id ON public.application_document_requirements USING btree (application_id);


--
-- Name: idx_document_requirements_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_requirements_application ON public.application_document_requirements USING btree (application_id);


--
-- Name: idx_documents_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_application ON public.application_documents USING btree (application_id);


--
-- Name: idx_documents_requirement; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_requirement ON public.application_documents USING btree (requirement_id);


--
-- Name: idx_form_answers_app_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_answers_app_id ON public.application_form_answers USING btree (application_id);


--
-- Name: idx_form_answers_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_answers_application ON public.application_form_answers USING btree (application_id);


--
-- Name: idx_form_answers_question_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_form_answers_question_key ON public.application_form_answers USING btree (question_key);


--
-- Name: idx_idempotency_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idempotency_expires ON public.idempotency_keys USING btree (expires_at);


--
-- Name: idx_idempotency_expiry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idempotency_expiry ON public.idempotency_keys USING btree (expires_at);


--
-- Name: idx_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idempotency_key ON public.idempotency_keys USING btree (idempotency_key);


--
-- Name: idx_idempotency_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_idempotency_user ON public.idempotency_keys USING btree (user_id);


--
-- Name: idx_outbox_aggregate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbox_aggregate ON public.outbox_events USING btree (aggregate_id);


--
-- Name: idx_outbox_unpublished; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbox_unpublished ON public.outbox_events USING btree (created_at) WHERE (published_at IS NULL);


--
-- Name: idx_status_history_app_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_history_app_id ON public.application_status_history USING btree (application_id);


--
-- Name: idx_status_history_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_history_application ON public.application_status_history USING btree (application_id);


--
-- Name: idx_status_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_status_history_changed_at ON public.application_status_history USING btree (changed_at);


--
-- Name: unique_current_document_per_requirement; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX unique_current_document_per_requirement ON public.application_documents USING btree (requirement_id) WHERE (is_current = true);


--
-- Name: application_form_answers fk_answers_application; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_form_answers
    ADD CONSTRAINT fk_answers_application FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: application_audit_logs fk_audit_application; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_audit_logs
    ADD CONSTRAINT fk_audit_application FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE SET NULL;


--
-- Name: application_documents fk_documents_application; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT fk_documents_application FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: application_documents fk_documents_requirement_application; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_documents
    ADD CONSTRAINT fk_documents_requirement_application FOREIGN KEY (requirement_id, application_id) REFERENCES public.application_document_requirements(id, application_id) ON DELETE RESTRICT;


--
-- Name: application_document_requirements fk_requirements_application; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_document_requirements
    ADD CONSTRAINT fk_requirements_application FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- Name: application_status_history fk_status_application; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_status_history
    ADD CONSTRAINT fk_status_application FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict nWg5DfJMS4YjjuPv5fxyMYEdp0frhqotQjQCJxYLhLVbrdHcqJs2Gc03vk1GCbS


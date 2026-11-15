--
-- PostgreSQL database dump
--

\restrict WQdvG7isYssm1z8taLSsBeUpKNSF60bpKNqyRcqLxOZbDWnYCKHBPm4yQQUy1HE

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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: scholarship_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarship_audit_logs (
    audit_id bigint NOT NULL,
    scholarship_id bigint,
    action character varying(100) NOT NULL,
    performed_by character varying(100),
    details jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: scholarship_audit_logs_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.scholarship_audit_logs ALTER COLUMN audit_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.scholarship_audit_logs_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: scholarship_benefits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarship_benefits (
    benefit_id bigint NOT NULL,
    scholarship_id bigint NOT NULL,
    benefit_type character varying(100) NOT NULL,
    description text,
    benefit_amount numeric(12,2),
    currency character varying(3) DEFAULT 'INR'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT scholarship_benefits_benefit_amount_check CHECK (((benefit_amount IS NULL) OR (benefit_amount >= (0)::numeric)))
);


--
-- Name: scholarship_benefits_benefit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.scholarship_benefits ALTER COLUMN benefit_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.scholarship_benefits_benefit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: scholarship_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarship_categories (
    category_id bigint NOT NULL,
    category_name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: scholarship_categories_category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.scholarship_categories ALTER COLUMN category_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.scholarship_categories_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: scholarship_eligibility_criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarship_eligibility_criteria (
    criterion_id bigint NOT NULL,
    scholarship_id bigint NOT NULL,
    criterion_type character varying(100) NOT NULL,
    operator character varying(30) NOT NULL,
    criterion_value jsonb NOT NULL,
    description text,
    is_mandatory boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: scholarship_eligibility_criteria_criterion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.scholarship_eligibility_criteria ALTER COLUMN criterion_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.scholarship_eligibility_criteria_criterion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: scholarship_required_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarship_required_documents (
    document_requirement_id bigint NOT NULL,
    scholarship_id bigint NOT NULL,
    document_name character varying(150) NOT NULL,
    description text,
    is_mandatory boolean DEFAULT true,
    allowed_file_types text[] DEFAULT ARRAY['pdf'::text, 'jpg'::text, 'jpeg'::text, 'png'::text],
    max_file_size_mb integer DEFAULT 5,
    display_order integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT scholarship_required_documents_max_file_size_mb_check CHECK ((max_file_size_mb > 0))
);


--
-- Name: scholarship_required_documents_document_requirement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.scholarship_required_documents ALTER COLUMN document_requirement_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.scholarship_required_documents_document_requirement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: scholarship_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarship_status_history (
    history_id bigint NOT NULL,
    scholarship_id bigint NOT NULL,
    old_status character varying(20),
    new_status character varying(20) NOT NULL,
    changed_by character varying(100),
    remarks text,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: scholarship_status_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.scholarship_status_history ALTER COLUMN history_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.scholarship_status_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: scholarships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scholarships (
    scholarship_id bigint NOT NULL,
    category_id bigint,
    scholarship_code character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    provider_name character varying(255),
    award_amount numeric(12,2) DEFAULT 0,
    currency character varying(3) DEFAULT 'INR'::character varying,
    academic_year character varying(20),
    total_slots integer,
    application_start_date date,
    application_end_date date,
    status character varying(20) DEFAULT 'draft'::character varying,
    official_website character varying(500),
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT scholarships_award_amount_check CHECK ((award_amount >= (0)::numeric)),
    CONSTRAINT scholarships_check CHECK (((application_start_date IS NULL) OR (application_end_date IS NULL) OR (application_end_date >= application_start_date))),
    CONSTRAINT scholarships_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'closed'::character varying, 'archived'::character varying])::text[]))),
    CONSTRAINT scholarships_total_slots_check CHECK (((total_slots IS NULL) OR (total_slots >= 0)))
);


--
-- Name: scholarships_scholarship_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.scholarships ALTER COLUMN scholarship_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.scholarships_scholarship_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: scholarship_audit_logs scholarship_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_audit_logs
    ADD CONSTRAINT scholarship_audit_logs_pkey PRIMARY KEY (audit_id);


--
-- Name: scholarship_benefits scholarship_benefits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_benefits
    ADD CONSTRAINT scholarship_benefits_pkey PRIMARY KEY (benefit_id);


--
-- Name: scholarship_categories scholarship_categories_category_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_categories
    ADD CONSTRAINT scholarship_categories_category_name_key UNIQUE (category_name);


--
-- Name: scholarship_categories scholarship_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_categories
    ADD CONSTRAINT scholarship_categories_pkey PRIMARY KEY (category_id);


--
-- Name: scholarship_eligibility_criteria scholarship_eligibility_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_eligibility_criteria
    ADD CONSTRAINT scholarship_eligibility_criteria_pkey PRIMARY KEY (criterion_id);


--
-- Name: scholarship_required_documents scholarship_required_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_required_documents
    ADD CONSTRAINT scholarship_required_documents_pkey PRIMARY KEY (document_requirement_id);


--
-- Name: scholarship_status_history scholarship_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_status_history
    ADD CONSTRAINT scholarship_status_history_pkey PRIMARY KEY (history_id);


--
-- Name: scholarships scholarships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships
    ADD CONSTRAINT scholarships_pkey PRIMARY KEY (scholarship_id);


--
-- Name: scholarships scholarships_scholarship_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships
    ADD CONSTRAINT scholarships_scholarship_code_key UNIQUE (scholarship_code);


--
-- Name: idx_audit_scholarship; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_scholarship ON public.scholarship_audit_logs USING btree (scholarship_id);


--
-- Name: idx_benefits_scholarship; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_benefits_scholarship ON public.scholarship_benefits USING btree (scholarship_id);


--
-- Name: idx_documents_scholarship; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documents_scholarship ON public.scholarship_required_documents USING btree (scholarship_id);


--
-- Name: idx_eligibility_scholarship; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eligibility_scholarship ON public.scholarship_eligibility_criteria USING btree (scholarship_id);


--
-- Name: idx_history_scholarship; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_scholarship ON public.scholarship_status_history USING btree (scholarship_id);


--
-- Name: idx_scholarships_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scholarships_category ON public.scholarships USING btree (category_id);


--
-- Name: idx_scholarships_deadlines; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scholarships_deadlines ON public.scholarships USING btree (application_end_date);


--
-- Name: idx_scholarships_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scholarships_status ON public.scholarships USING btree (status);


--
-- Name: scholarship_audit_logs scholarship_audit_logs_scholarship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_audit_logs
    ADD CONSTRAINT scholarship_audit_logs_scholarship_id_fkey FOREIGN KEY (scholarship_id) REFERENCES public.scholarships(scholarship_id) ON DELETE SET NULL;


--
-- Name: scholarship_benefits scholarship_benefits_scholarship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_benefits
    ADD CONSTRAINT scholarship_benefits_scholarship_id_fkey FOREIGN KEY (scholarship_id) REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE;


--
-- Name: scholarship_eligibility_criteria scholarship_eligibility_criteria_scholarship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_eligibility_criteria
    ADD CONSTRAINT scholarship_eligibility_criteria_scholarship_id_fkey FOREIGN KEY (scholarship_id) REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE;


--
-- Name: scholarship_required_documents scholarship_required_documents_scholarship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_required_documents
    ADD CONSTRAINT scholarship_required_documents_scholarship_id_fkey FOREIGN KEY (scholarship_id) REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE;


--
-- Name: scholarship_status_history scholarship_status_history_scholarship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarship_status_history
    ADD CONSTRAINT scholarship_status_history_scholarship_id_fkey FOREIGN KEY (scholarship_id) REFERENCES public.scholarships(scholarship_id) ON DELETE CASCADE;


--
-- Name: scholarships scholarships_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scholarships
    ADD CONSTRAINT scholarships_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.scholarship_categories(category_id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict WQdvG7isYssm1z8taLSsBeUpKNSF60bpKNqyRcqLxOZbDWnYCKHBPm4yQQUy1HE


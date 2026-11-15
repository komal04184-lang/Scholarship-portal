--
-- PostgreSQL database dump
--

\restrict ACsik59aDqnsMPPCbpEU3umIyIvg0WhNoJOLaD91xhsFBhgNNLNEWOE0mH0gWrB

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
-- Name: application_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.application_reviews (
    review_id bigint NOT NULL,
    assignment_id bigint NOT NULL,
    application_id character varying(100) NOT NULL,
    reviewer_id bigint NOT NULL,
    recommendation character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    overall_score numeric(5,2),
    comments text,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT application_reviews_overall_score_check CHECK (((overall_score IS NULL) OR ((overall_score >= (0)::numeric) AND (overall_score <= (100)::numeric)))),
    CONSTRAINT application_reviews_recommendation_check CHECK (((recommendation)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'needs_revision'::character varying])::text[])))
);


--
-- Name: application_reviews_review_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.application_reviews ALTER COLUMN review_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.application_reviews_review_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: review_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_assignments (
    assignment_id bigint NOT NULL,
    application_id character varying(100) NOT NULL,
    reviewer_id bigint NOT NULL,
    assigned_by character varying(100),
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    due_date date,
    status character varying(30) DEFAULT 'assigned'::character varying,
    CONSTRAINT review_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['assigned'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'reassigned'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: review_assignments_assignment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.review_assignments ALTER COLUMN assignment_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.review_assignments_assignment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: review_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_audit_logs (
    audit_id bigint NOT NULL,
    review_id bigint,
    action character varying(100) NOT NULL,
    performed_by character varying(100),
    details jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: review_audit_logs_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.review_audit_logs ALTER COLUMN audit_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.review_audit_logs_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: review_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_comments (
    comment_id bigint NOT NULL,
    review_id bigint NOT NULL,
    user_id character varying(100) NOT NULL,
    comment text NOT NULL,
    is_internal boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: review_comments_comment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.review_comments ALTER COLUMN comment_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.review_comments_comment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: review_criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_criteria (
    criterion_id bigint NOT NULL,
    criterion_name character varying(150) NOT NULL,
    description text,
    max_score numeric(5,2) DEFAULT 100,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT review_criteria_max_score_check CHECK ((max_score > (0)::numeric))
);


--
-- Name: review_criteria_criterion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.review_criteria ALTER COLUMN criterion_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.review_criteria_criterion_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: review_criterion_scores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_criterion_scores (
    score_id bigint NOT NULL,
    review_id bigint NOT NULL,
    criterion_id bigint NOT NULL,
    score numeric(5,2) NOT NULL,
    remarks text,
    CONSTRAINT review_criterion_scores_score_check CHECK ((score >= (0)::numeric))
);


--
-- Name: review_criterion_scores_score_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.review_criterion_scores ALTER COLUMN score_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.review_criterion_scores_score_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: review_outbox_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_outbox_events (
    event_id bigint NOT NULL,
    aggregate_type character varying(100) NOT NULL,
    aggregate_id character varying(100) NOT NULL,
    event_type character varying(150) NOT NULL,
    payload jsonb NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp without time zone,
    CONSTRAINT review_outbox_events_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'processed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: review_outbox_events_event_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.review_outbox_events ALTER COLUMN event_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.review_outbox_events_event_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: review_reassignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_reassignments (
    reassignment_id bigint NOT NULL,
    assignment_id bigint NOT NULL,
    old_reviewer_id bigint,
    new_reviewer_id bigint NOT NULL,
    reassigned_by character varying(100),
    reason text,
    reassigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: review_reassignments_reassignment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.review_reassignments ALTER COLUMN reassignment_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.review_reassignments_reassignment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: review_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_status_history (
    history_id bigint NOT NULL,
    review_id bigint NOT NULL,
    old_status character varying(30),
    new_status character varying(30) NOT NULL,
    changed_by character varying(100),
    remarks text,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: review_status_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.review_status_history ALTER COLUMN history_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.review_status_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: reviewers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviewers (
    reviewer_id bigint NOT NULL,
    user_id character varying(100) NOT NULL,
    department character varying(150),
    specialization text,
    is_available boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: reviewers_reviewer_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.reviewers ALTER COLUMN reviewer_id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.reviewers_reviewer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: application_reviews application_reviews_assignment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_reviews
    ADD CONSTRAINT application_reviews_assignment_id_key UNIQUE (assignment_id);


--
-- Name: application_reviews application_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_reviews
    ADD CONSTRAINT application_reviews_pkey PRIMARY KEY (review_id);


--
-- Name: review_assignments review_assignments_application_id_reviewer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_assignments
    ADD CONSTRAINT review_assignments_application_id_reviewer_id_key UNIQUE (application_id, reviewer_id);


--
-- Name: review_assignments review_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_assignments
    ADD CONSTRAINT review_assignments_pkey PRIMARY KEY (assignment_id);


--
-- Name: review_audit_logs review_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_audit_logs
    ADD CONSTRAINT review_audit_logs_pkey PRIMARY KEY (audit_id);


--
-- Name: review_comments review_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_pkey PRIMARY KEY (comment_id);


--
-- Name: review_criteria review_criteria_criterion_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_criteria
    ADD CONSTRAINT review_criteria_criterion_name_key UNIQUE (criterion_name);


--
-- Name: review_criteria review_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_criteria
    ADD CONSTRAINT review_criteria_pkey PRIMARY KEY (criterion_id);


--
-- Name: review_criterion_scores review_criterion_scores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_criterion_scores
    ADD CONSTRAINT review_criterion_scores_pkey PRIMARY KEY (score_id);


--
-- Name: review_criterion_scores review_criterion_scores_review_id_criterion_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_criterion_scores
    ADD CONSTRAINT review_criterion_scores_review_id_criterion_id_key UNIQUE (review_id, criterion_id);


--
-- Name: review_outbox_events review_outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_outbox_events
    ADD CONSTRAINT review_outbox_events_pkey PRIMARY KEY (event_id);


--
-- Name: review_reassignments review_reassignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reassignments
    ADD CONSTRAINT review_reassignments_pkey PRIMARY KEY (reassignment_id);


--
-- Name: review_status_history review_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_status_history
    ADD CONSTRAINT review_status_history_pkey PRIMARY KEY (history_id);


--
-- Name: reviewers reviewers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviewers
    ADD CONSTRAINT reviewers_pkey PRIMARY KEY (reviewer_id);


--
-- Name: reviewers reviewers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviewers
    ADD CONSTRAINT reviewers_user_id_key UNIQUE (user_id);


--
-- Name: idx_assignments_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_application ON public.review_assignments USING btree (application_id);


--
-- Name: idx_assignments_reviewer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_reviewer ON public.review_assignments USING btree (reviewer_id);


--
-- Name: idx_assignments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assignments_status ON public.review_assignments USING btree (status);


--
-- Name: idx_comments_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comments_review ON public.review_comments USING btree (review_id);


--
-- Name: idx_history_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_review ON public.review_status_history USING btree (review_id);


--
-- Name: idx_outbox_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbox_status ON public.review_outbox_events USING btree (status);


--
-- Name: idx_reassignments_assignment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reassignments_assignment ON public.review_reassignments USING btree (assignment_id);


--
-- Name: idx_reviews_application; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_application ON public.application_reviews USING btree (application_id);


--
-- Name: idx_reviews_recommendation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_recommendation ON public.application_reviews USING btree (recommendation);


--
-- Name: idx_reviews_reviewer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_reviewer ON public.application_reviews USING btree (reviewer_id);


--
-- Name: idx_scores_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scores_review ON public.review_criterion_scores USING btree (review_id);


--
-- Name: application_reviews application_reviews_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_reviews
    ADD CONSTRAINT application_reviews_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.review_assignments(assignment_id) ON DELETE RESTRICT;


--
-- Name: application_reviews application_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_reviews
    ADD CONSTRAINT application_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.reviewers(reviewer_id) ON DELETE RESTRICT;


--
-- Name: review_assignments review_assignments_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_assignments
    ADD CONSTRAINT review_assignments_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.reviewers(reviewer_id) ON DELETE RESTRICT;


--
-- Name: review_audit_logs review_audit_logs_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_audit_logs
    ADD CONSTRAINT review_audit_logs_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.application_reviews(review_id) ON DELETE SET NULL;


--
-- Name: review_comments review_comments_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_comments
    ADD CONSTRAINT review_comments_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.application_reviews(review_id) ON DELETE CASCADE;


--
-- Name: review_criterion_scores review_criterion_scores_criterion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_criterion_scores
    ADD CONSTRAINT review_criterion_scores_criterion_id_fkey FOREIGN KEY (criterion_id) REFERENCES public.review_criteria(criterion_id) ON DELETE RESTRICT;


--
-- Name: review_criterion_scores review_criterion_scores_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_criterion_scores
    ADD CONSTRAINT review_criterion_scores_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.application_reviews(review_id) ON DELETE CASCADE;


--
-- Name: review_reassignments review_reassignments_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reassignments
    ADD CONSTRAINT review_reassignments_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.review_assignments(assignment_id) ON DELETE RESTRICT;


--
-- Name: review_reassignments review_reassignments_new_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reassignments
    ADD CONSTRAINT review_reassignments_new_reviewer_id_fkey FOREIGN KEY (new_reviewer_id) REFERENCES public.reviewers(reviewer_id) ON DELETE RESTRICT;


--
-- Name: review_reassignments review_reassignments_old_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reassignments
    ADD CONSTRAINT review_reassignments_old_reviewer_id_fkey FOREIGN KEY (old_reviewer_id) REFERENCES public.reviewers(reviewer_id) ON DELETE RESTRICT;


--
-- Name: review_status_history review_status_history_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_status_history
    ADD CONSTRAINT review_status_history_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.application_reviews(review_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ACsik59aDqnsMPPCbpEU3umIyIvg0WhNoJOLaD91xhsFBhgNNLNEWOE0mH0gWrB


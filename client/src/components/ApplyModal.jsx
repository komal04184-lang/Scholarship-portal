import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Upload,
  CheckCircle,
  FileText,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Eye,
  Download,
  ShieldCheck,
  Loader2,
  Check,
} from 'lucide-react';
import {
  getStudentProfile,
  createDraftApplication,
  updateDraftApplication,
  submitDraftApplication,
  getApplicationRequirements,
  getApplicationDocuments,
  uploadApplicationDocument,
  replaceApplicationDocument,
  downloadDocumentFile,
} from '../services/api';

export default function ApplyModal({ scholarship, user, onClose, onSuccess, existingDraft }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Application Draft & Requirements
  const [draftApp, setDraftApp] = useState(existingDraft || null);
  const [sop, setSop] = useState(existingDraft?.sop || existingDraft?.statement || '');
  const [requirements, setRequirements] = useState([]);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [uploadingReqId, setUploadingReqId] = useState(null);

  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [missingRequirements, setMissingRequirements] = useState([]);

  const deadlineStr = scholarship?.deadline || existingDraft?.scholarship?.deadline;
  let isExpired = false;
  if (deadlineStr && !isNaN(new Date(deadlineStr).getTime())) {
    const checkDate = new Date(deadlineStr);
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(deadlineStr).trim())) {
      checkDate.setHours(23, 59, 59, 999);
    }
    isExpired = checkDate.getTime() < Date.now();
  }

  const handleSafeClose = () => {
    if (step === 4) {
      onClose();
      return;
    }
    const initialSop = existingDraft?.sop || existingDraft?.statement || '';
    const hasSopChanged = sop.trim() !== initialSop.trim() && sop.trim().length > 0;
    if (hasSopChanged) {
      const confirmDiscard = window.confirm(
        'You have unsaved changes in your application. Do you want to discard them and exit?'
      );
      if (!confirmDiscard) return;
    }
    onClose();
  };

  if (!scholarship && !existingDraft) return null;

  // 1. Fetch fresh student profile on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchProfile() {
      setLoadingProfile(true);
      try {
        const p = await getStudentProfile();
        if (isMounted) {
          setProfile(p);
        }
      } catch (err) {
        console.warn('Failed to load student profile for apply modal:', err.message);
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    }
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1b. If resuming an existing draft, preload requirements, documents, and jump to SOP step
  useEffect(() => {
    if (existingDraft) {
      setDraftApp(existingDraft);
      setSop(existingDraft.sop || existingDraft.statement || '');
      setStep(2);

      const appId = existingDraft.application_id || existingDraft.id || existingDraft.raw_id;
      if (appId) {
        Promise.all([
          getApplicationRequirements(appId),
          getApplicationDocuments(appId),
        ]).then(([reqs, docs]) => {
          setRequirements(Array.isArray(reqs) && reqs.length > 0 ? reqs : getFallbackRequirements());
          setUploadedDocs(Array.isArray(docs) ? docs : []);
        }).catch((e) => {
          console.warn('Failed to load draft documents/requirements:', e);
        });
      }
    }
  }, [existingDraft]);

  // Initialize or fetch draft when moving to Step 2 or Step 3
  const ensureDraftApplication = async () => {
    if (draftApp) return draftApp;
    setSavingDraft(true);
    setError('');
    try {
      const sId = scholarship?.scholarship_id || scholarship?.id || existingDraft?.scholarship_id;
      const res = await createDraftApplication({
        scholarship_id: sId,
        sop: sop || 'Statement of purpose in progress',
      });
      const app = res.data?.application || res.application || res.body?.application;
      if (!app) {
        throw new Error('Draft application could not be initialized.');
      }
      setDraftApp(app);

      // Load requirements snapshot for this application
      const appId = app.application_id || app.id || app.raw_id;
      const [reqs, docs] = await Promise.all([
        getApplicationRequirements(appId),
        getApplicationDocuments(appId),
      ]);

      setRequirements(Array.isArray(reqs) && reqs.length > 0 ? reqs : getFallbackRequirements());
      setUploadedDocs(Array.isArray(docs) ? docs : []);
      return app;
    } catch (err) {
      const msg = err.message || 'Failed to initialize application draft.';
      setError(msg);
      throw err;
    } finally {
      setSavingDraft(false);
    }
  };

  const getFallbackRequirements = () => {
    const rawReqs = scholarship?.required_documents || scholarship?.requiredDocuments;
    if (Array.isArray(rawReqs) && rawReqs.length > 0) {
      return rawReqs.map((r, idx) => ({
        requirement_id: `fallback-${idx + 1}`,
        requirement_name: typeof r === 'string' ? r : (r.name || r.document_name || 'Verification Document'),
        requirement_code: typeof r === 'string' ? r.toUpperCase().replace(/\s+/g, '_') : (r.code || `DOC_${idx + 1}`),
        is_mandatory: typeof r === 'string' ? true : (r.mandatory !== false && r.is_mandatory !== false),
      }));
    }
    return [
      { requirement_id: 'default-1', requirement_name: 'Academic Marksheet', requirement_code: 'MARKSHEET', is_mandatory: true },
      { requirement_id: 'default-2', requirement_name: 'Income Certificate', requirement_code: 'INCOME_CERT', is_mandatory: true },
      { requirement_id: 'default-3', requirement_name: 'College Identity Card', requirement_code: 'ID_CARD', is_mandatory: true },
    ];
  };

  // Step 2 -> Step 3 transition
  const handleProceedToDocuments = async () => {
    if (!sop.trim() || sop.trim().length < 15) {
      setError('Please provide a Statement of Purpose or motivation essay (minimum 15 characters).');
      return;
    }
    setError('');
    try {
      const app = await ensureDraftApplication();
      const appId = app.application_id || app.id || app.raw_id;
      // Persist any updated SOP
      if (appId) {
        await updateDraftApplication(appId, { sop });
      }
      const [reqs, docs] = await Promise.all([
        getApplicationRequirements(appId),
        getApplicationDocuments(appId),
      ]);
      setRequirements(Array.isArray(reqs) && reqs.length > 0 ? reqs : getFallbackRequirements());
      setUploadedDocs(Array.isArray(docs) ? docs : []);
      setStep(3);
    } catch (err) {
      // Error already handled
    }
  };

  // Save draft only and close modal
  const handleSaveDraftOnly = async () => {
    setError('');
    setSavingDraft(true);
    try {
      let app = draftApp;
      if (!app) {
        app = await ensureDraftApplication();
      } else {
        const appId = app.application_id || app.id || app.raw_id;
        await updateDraftApplication(appId, { sop });
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save draft.');
    } finally {
      setSavingDraft(false);
    }
  };

  // Upload or replace document for a specific requirement
  const handleFileUpload = async (reqItem, file) => {
    if (!file) return;
    setError('');
    setMissingRequirements([]);
    const appId = draftApp?.application_id || draftApp?.id || draftApp?.raw_id;
    if (!appId) {
      setError('No active draft application found. Please try again.');
      return;
    }

    const reqId = reqItem.requirement_id || reqItem.id;
    const reqName = reqItem.requirement_name || reqItem.name || 'Document';

    // Find if a document is already uploaded for this requirement
    const matchedDoc = uploadedDocs.find((d) => {
      if (reqId && d.requirement_id) {
        return String(d.requirement_id) === String(reqId);
      }
      const docName = (d.document_name || d.original_name || d.original_filename || '').toLowerCase();
      return docName.includes(reqName.toLowerCase()) || reqName.toLowerCase().includes(docName);
    });

    setUploadingReqId(reqId || reqItem.requirement_code || reqName);
    try {
      if (matchedDoc && (matchedDoc.id || matchedDoc.application_document_id)) {
        const docId = matchedDoc.id || matchedDoc.application_document_id;
        await replaceApplicationDocument(appId, docId, file, reqName);
      } else {
        await uploadApplicationDocument(appId, file, reqName, reqId);
      }

      // Refresh documents
      const docs = await getApplicationDocuments(appId);
      setUploadedDocs(Array.isArray(docs) ? docs : []);
    } catch (err) {
      setError(`Failed to upload ${reqName}: ${err.message}`);
    } finally {
      setUploadingReqId(null);
    }
  };

  // Check which mandatory requirements are missing
  const getMissingMandatoryRequirements = () => {
    const missing = [];
    for (const req of requirements) {
      const isMandatory = req.is_mandatory !== false && req.mandatory !== false;
      if (!isMandatory) continue;

      const hasUploaded = uploadedDocs.some((d) => {
        if (req.requirement_id && d.requirement_id) {
          return String(d.requirement_id) === String(req.requirement_id);
        }
        const docName = (d.document_name || d.original_name || d.original_filename || '').toLowerCase();
        const reqName = (req.requirement_name || req.name || '').toLowerCase();
        return docName.includes(reqName) || reqName.includes(docName);
      });

      if (!hasUploaded) {
        missing.push(req.requirement_name || req.name || 'Required Document');
      }
    }
    return missing;
  };

  // Handle final submission
  const handleFinalSubmit = async () => {
    setError('');
    setMissingRequirements([]);

    if (isExpired) {
      setError('Cannot submit application: The scholarship application deadline has passed.');
      return;
    }

    const missing = getMissingMandatoryRequirements();
    if (missing.length > 0) {
      setMissingRequirements(missing);
      setError(`Cannot submit application. Missing mandatory documents: ${missing.join(', ')}`);
      return;
    }

    const appId = draftApp?.application_id || draftApp?.id;
    if (!appId) {
      setError('Active draft application not found. Please restart the application.');
      return;
    }

    setSubmitting(true);
    try {
      await submitDraftApplication(appId);

      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
      });

      setStep(4);
      if (onSuccess) onSuccess();
    } catch (err) {
      if (err.statusCode === 400 && err.details?.missing_requirements) {
        setMissingRequirements(err.details.missing_requirements);
        setError(`Cannot submit: Missing required documents: ${err.details.missing_requirements.join(', ')}`);
      } else if (err.statusCode === 409) {
        setError('You have already submitted an application for this scholarship program.');
      } else {
        setError(err.message || 'Failed to submit application. Please review documents.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Helper values for authentic profile display
  const studentName = profile?.name || profile?.username || user?.username || 'Not provided';
  const enrollmentNo = profile?.enrollment_no || profile?.student_uid || profile?.academics?.student_uid || 'Not provided';
  const branch = profile?.academic_details?.branch || profile?.academics?.department || 'Not provided';
  const course = profile?.academic_details?.course || profile?.academics?.degree_level || 'Not provided';
  const institution = profile?.academic_details?.institution_name || 'Not provided';
  const cgpaValue = profile?.academic_details?.cgpa != null
    ? profile.academic_details.cgpa
    : (profile?.academics?.cgpa != null ? profile.academics.cgpa : 'Not provided');
  const marksPct = profile?.academic_details?.marks_percentage != null
    ? `${profile.academic_details.marks_percentage}%`
    : 'Not provided';
  const semesterStr = profile?.academic_details?.semester != null
    ? `Semester ${profile.academic_details.semester}`
    : 'Not provided';
  const academicYearStr = profile?.academic_details?.academic_year || 'Not provided';
  const familyIncomeStr = profile?.family_income != null
    ? `₹${Number(profile.family_income).toLocaleString('en-IN')}`
    : (profile?.academics?.family_annual_income != null
        ? `₹${Number(profile.academics.family_annual_income).toLocaleString('en-IN')}`
        : 'Not provided');
  const categoryStr = profile?.category || 'Not provided';

  const sTitle = scholarship.title || scholarship.name || 'Scholarship Scheme';
  const sCategory = scholarship.category || scholarship.eligible_category || 'Merit';
  const sAmount = scholarship.amount ? `₹${Number(scholarship.amount).toLocaleString('en-IN')}` : 'Full Grant';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1000,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={step === 4 ? undefined : handleSafeClose}
    >
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0B1120',
          color: '#F8FAFC',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Full-Screen Top Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.1rem 2.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(12px)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.15rem 0.6rem',
                    borderRadius: '999px',
                    background: 'rgba(99, 102, 241, 0.2)',
                    color: '#818CF8',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    textTransform: 'uppercase',
                  }}
                >
                  {sCategory}
                </span>
                <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                  Award Value: <strong style={{ color: '#34D399' }}>{sAmount}</strong>
                </span>
              </div>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#F8FAFC', margin: '0.2rem 0 0 0' }}>
                {sTitle}
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {draftApp && (
              <span style={{ fontSize: '0.8rem', color: '#94A3B8', background: 'rgba(255,255,255,0.05)', padding: '0.35rem 0.75rem', borderRadius: '6px' }}>
                Application No: <strong style={{ color: '#38BDF8' }}>{draftApp.application_number || draftApp.id}</strong>
              </span>
            )}
            <button
              onClick={handleSafeClose}
              title="Close Application Window"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#CBD5E1',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.color = '#F87171';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#CBD5E1';
              }}
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* 3-Step Modern Navigation Header */}
        {step !== 4 && (
          <div
            style={{
              padding: '1rem 2.5rem',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', width: '100%', maxWidth: '820px' }}>
              {[
                { num: 1, label: 'Academic Profile' },
                { num: 2, label: 'Statement of Purpose' },
                { num: 3, label: 'Required Documents' },
              ].map((s) => {
                const isPassed = step > s.num;
                const isCurrent = step === s.num;
                return (
                  <div key={s.num} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: isPassed ? '#10B981' : isCurrent ? '#3B82F6' : 'rgba(255,255,255,0.1)',
                          color: '#FFFFFF',
                        }}
                      >
                        {isPassed ? <Check size={14} /> : s.num}
                      </div>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent ? '#FFFFFF' : isPassed ? '#10B981' : '#64748B',
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                    <div
                      style={{
                        height: '4px',
                        borderRadius: '2px',
                        backgroundColor: isPassed ? '#10B981' : isCurrent ? '#3B82F6' : 'rgba(255,255,255,0.08)',
                        transition: 'background-color 0.25s ease',
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '2rem 1.5rem',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div style={{ width: '100%', maxWidth: '920px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Error Notification Banner */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '1rem 1.25rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  color: '#FCA5A5',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                }}
              >
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <strong>Application Notice: </strong>
                  <span>{error}</span>
                  {missingRequirements.length > 0 && (
                    <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                      {missingRequirements.map((r, i) => (
                        <li key={i} style={{ color: '#F87171' }}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* ================= STEP 1: Academic Profile ================= */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1.75rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <div>
                      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                        Authentic Student Academic Profile
                      </h2>
                      <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                        Verified institutional metrics loaded from Identity Service. These records are evaluated by the scholarship review committee.
                      </p>
                    </div>
                    {loadingProfile && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38BDF8', fontSize: '0.8rem' }}>
                        <Loader2 size={16} className="animate-spin" /> Fetching profile...
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                      gap: '1.25rem',
                      backgroundColor: 'rgba(11, 17, 32, 0.8)',
                      padding: '1.5rem',
                      borderRadius: '10px',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Student Full Name
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F1F5F9', marginTop: '0.25rem' }}>
                        {studentName}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Enrollment Number / Roll
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#38BDF8', marginTop: '0.25rem' }}>
                        {enrollmentNo}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Department / Branch
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F1F5F9', marginTop: '0.25rem' }}>
                        {branch}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Degree / Course
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F1F5F9', marginTop: '0.25rem' }}>
                        {course}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Current CGPA
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34D399', marginTop: '0.2rem' }}>
                        {cgpaValue !== 'Not provided' ? `${cgpaValue} / 10.0` : 'Not provided'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Marks Percentage
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: '#60A5FA', marginTop: '0.2rem' }}>
                        {marksPct}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Semester / Academic Year
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F1F5F9', marginTop: '0.25rem' }}>
                        {semesterStr} {academicYearStr !== 'Not provided' ? `(${academicYearStr})` : ''}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Family Annual Income
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#FBBF24', marginTop: '0.25rem' }}>
                        {familyIncomeStr}
                      </div>
                    </div>

                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                        Enrolled Institution
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#F1F5F9', marginTop: '0.25rem' }}>
                        {institution}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '10px',
                    padding: '1.25rem',
                    fontSize: '0.85rem',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <ShieldCheck size={20} color="#10B981" />
                  <span>
                    By proceeding, you confirm that these academic records reflect your official university profile. If any detail needs correction, update your Student Profile before final submission.
                  </span>
                </div>
              </div>
            )}

            {/* ================= STEP 2: Statement of Purpose ================= */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1.75rem',
                  }}
                >
                  <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '0.4rem' }}>
                    Statement of Purpose & Academic Motivation
                  </h2>
                  <p style={{ fontSize: '0.84rem', color: '#94A3B8', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                    Articulate your academic goals, research interests, and why you are applying for <strong>{sTitle}</strong>. Mention how this grant supports your educational trajectory.
                  </p>

                  <div style={{ position: 'relative' }}>
                    <textarea
                      rows={8}
                      placeholder="Write your Statement of Purpose (SOP)... e.g., 'I am pursuing Computer Science with a focus on Distributed Systems. Receiving this scholarship will enable me to complete my final-year capstone research and purchase essential academic resources...'"
                      value={sop}
                      onChange={(e) => setSop(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: 'rgba(11, 17, 32, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        color: '#F8FAFC',
                        padding: '1rem',
                        fontSize: '0.92rem',
                        lineHeight: 1.6,
                        resize: 'vertical',
                        outline: 'none',
                        fontFamily: 'inherit',
                      }}
                    />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.75rem',
                        color: '#64748B',
                        marginTop: '0.4rem',
                      }}
                    >
                      <span>Minimum required: 15 characters</span>
                      <span>
                        {sop.trim() ? sop.trim().split(/\s+/).filter(Boolean).length : 0} words · {sop.length} characters
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 3: Mandatory Documents ================= */}
            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '1.75rem',
                  }}
                >
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#F8FAFC' }}>
                      Required Verification Documents
                    </h2>
                    <p style={{ fontSize: '0.84rem', color: '#94A3B8', marginTop: '0.2rem' }}>
                      Every mandatory requirement must have an active uploaded document before final submission. Supported formats: <strong>PDF, PNG, JPG, JPEG</strong> (Max 10MB).
                    </p>
                  </div>

                  {/* Deadline Passed Banner */}
                  {isExpired && (
                    <div
                      style={{
                        padding: '1rem 1.25rem',
                        marginBottom: '1.5rem',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: '#FCA5A5',
                        fontSize: '0.88rem',
                        lineHeight: 1.5,
                      }}
                    >
                      <strong>⛔ Application Deadline Passed:</strong> The deadline for this scholarship award has passed. Although you can review your draft or save changes, final submissions are no longer accepted.
                    </div>
                  )}

                  {/* Requirements Table */}
                  <div
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      backgroundColor: 'rgba(11, 17, 32, 0.75)',
                    }}
                  >
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'rgba(255, 255, 255, 0.04)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                          <th style={{ padding: '0.85rem 1rem', color: '#94A3B8', fontWeight: 600, width: '60px' }}>#</th>
                          <th style={{ padding: '0.85rem 1rem', color: '#94A3B8', fontWeight: 600 }}>Required Document</th>
                          <th style={{ padding: '0.85rem 1rem', color: '#94A3B8', fontWeight: 600, width: '120px' }}>Category</th>
                          <th style={{ padding: '0.85rem 1rem', color: '#94A3B8', fontWeight: 600, width: '130px' }}>Status</th>
                          <th style={{ padding: '0.85rem 1rem', color: '#94A3B8', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requirements.map((req, idx) => {
                          const reqId = req.requirement_id;
                          const reqName = req.requirement_name || req.name || 'Verification Document';
                          const isMandatory = req.is_mandatory !== false && req.mandatory !== false;

                          // Find matching active uploaded document
                          const matchedDoc = uploadedDocs.find((d) => {
                            if (reqId && d.requirement_id) {
                              return String(d.requirement_id) === String(reqId);
                            }
                            const docName = (d.document_name || d.original_name || d.original_filename || '').toLowerCase();
                            return docName.includes(reqName.toLowerCase()) || reqName.toLowerCase().includes(docName);
                          });

                          const isUploading = uploadingReqId === (reqId || req.requirement_code || reqName);

                          return (
                            <tr
                              key={reqId || idx}
                              style={{
                                borderBottom: idx < requirements.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                                backgroundColor: matchedDoc ? 'rgba(16, 185, 129, 0.02)' : 'transparent',
                              }}
                            >
                              <td style={{ padding: '0.9rem 1rem', color: '#64748B' }}>{idx + 1}</td>
                              <td style={{ padding: '0.9rem 1rem' }}>
                                <div style={{ fontWeight: 600, color: '#F1F5F9' }}>{reqName}</div>
                                {matchedDoc && (
                                  <div style={{ fontSize: '0.75rem', color: '#38BDF8', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <FileText size={13} /> {matchedDoc.original_filename || matchedDoc.original_name || matchedDoc.document_name}
                                    {matchedDoc.file_size_bytes && ` (${(matchedDoc.file_size_bytes / 1024).toFixed(1)} KB)`}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '0.9rem 1rem' }}>
                                {isMandatory ? (
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 700,
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '4px',
                                      background: 'rgba(239, 68, 68, 0.15)',
                                      color: '#F87171',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                    }}
                                  >
                                    Mandatory *
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '4px',
                                      background: 'rgba(148, 163, 184, 0.1)',
                                      color: '#94A3B8',
                                    }}
                                  >
                                    Optional
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '0.9rem 1rem' }}>
                                {isUploading ? (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#38BDF8', fontSize: '0.78rem' }}>
                                    <Loader2 size={14} className="animate-spin" /> Uploading...
                                  </span>
                                ) : matchedDoc ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      fontSize: '0.76rem',
                                      fontWeight: 600,
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: '4px',
                                      background: 'rgba(16, 185, 129, 0.15)',
                                      color: '#34D399',
                                    }}
                                  >
                                    <CheckCircle size={13} /> Uploaded
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      fontSize: '0.76rem',
                                      fontWeight: 600,
                                      padding: '0.2rem 0.55rem',
                                      borderRadius: '4px',
                                      background: 'rgba(245, 158, 11, 0.15)',
                                      color: '#FBBF24',
                                    }}
                                  >
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                                  {matchedDoc && (
                                    <>
                                      <button
                                        type="button"
                                        title="Preview Document"
                                        onClick={() => {
                                          const appId = draftApp?.application_id || draftApp?.id;
                                          const docId = matchedDoc.id || matchedDoc.application_document_id;
                                          downloadDocumentFile(appId, docId, matchedDoc.original_filename || 'document.pdf', true);
                                        }}
                                        style={{
                                          background: 'rgba(255, 255, 255, 0.08)',
                                          border: '1px solid rgba(255, 255, 255, 0.1)',
                                          borderRadius: '6px',
                                          padding: '0.35rem 0.55rem',
                                          color: '#38BDF8',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                          fontSize: '0.75rem',
                                        }}
                                      >
                                        <Eye size={13} /> View
                                      </button>
                                      <button
                                        type="button"
                                        title="Download Document"
                                        onClick={() => {
                                          const appId = draftApp?.application_id || draftApp?.id;
                                          const docId = matchedDoc.id || matchedDoc.application_document_id;
                                          downloadDocumentFile(appId, docId, matchedDoc.original_filename || 'document.pdf', false);
                                        }}
                                        style={{
                                          background: 'rgba(255, 255, 255, 0.08)',
                                          border: '1px solid rgba(255, 255, 255, 0.1)',
                                          borderRadius: '6px',
                                          padding: '0.35rem 0.55rem',
                                          color: '#94A3B8',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '0.25rem',
                                          fontSize: '0.75rem',
                                        }}
                                      >
                                        <Download size={13} />
                                      </button>
                                    </>
                                  )}

                                  <label
                                    style={{
                                      cursor: isUploading ? 'not-allowed' : 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      padding: '0.35rem 0.75rem',
                                      borderRadius: '6px',
                                      background: matchedDoc ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, #3B82F6, #2563EB)',
                                      color: '#FFFFFF',
                                      fontSize: '0.78rem',
                                      fontWeight: 600,
                                      border: matchedDoc ? '1px solid rgba(255, 255, 255, 0.12)' : 'none',
                                      opacity: isUploading ? 0.6 : 1,
                                    }}
                                  >
                                    <Upload size={13} /> {matchedDoc ? 'Replace' : 'Upload'}
                                    <input
                                      type="file"
                                      accept=".pdf,.png,.jpg,.jpeg"
                                      disabled={isUploading}
                                      style={{ display: 'none' }}
                                      onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                          handleFileUpload(req, e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ================= STEP 4: Success Confetti ================= */}
            {step === 4 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '4rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.18)',
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    boxShadow: '0 0 32px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <CheckCircle size={48} />
                </div>

                <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#F8FAFC', marginBottom: '0.5rem' }}>
                  Application Successfully Submitted!
                </h2>
                <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: '520px', lineHeight: 1.6, marginBottom: '2rem' }}>
                  Your application for <strong>{sTitle}</strong> has been registered with Application Number{' '}
                  <strong style={{ color: '#38BDF8' }}>{draftApp?.application_number || draftApp?.id}</strong>.
                  All mandatory verification documents have been securely recorded.
                </p>

                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.85rem 2.25rem',
                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    color: '#FFFFFF',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  Go to Student Dashboard <Sparkles size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Bottom Navigation Footer */}
        {step !== 4 && (
          <footer
            style={{
              padding: '1.1rem 2.5rem',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div>
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setStep((prev) => prev - 1);
                  }}
                  style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#CBD5E1',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '0.65rem 1.25rem',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '8px',
                    color: '#94A3B8',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {step === 1 && (
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{
                    padding: '0.65rem 1.5rem',
                    background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                  }}
                >
                  Confirm & Continue <ArrowRight size={16} />
                </button>
              )}

              {step === 2 && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    disabled={savingDraft}
                    onClick={handleSaveDraftOnly}
                    style={{
                      padding: '0.65rem 1.25rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#E2E8F0',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: savingDraft ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Save Draft & Exit
                  </button>
                  <button
                    type="button"
                    disabled={savingDraft}
                    onClick={handleProceedToDocuments}
                    style={{
                      padding: '0.65rem 1.5rem',
                      background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: savingDraft ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      opacity: savingDraft ? 0.7 : 1,
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    {savingDraft ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Saving Draft...
                      </>
                    ) : (
                      <>
                        Proceed to Documents <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              )}

              {step === 3 && (
                <>
                  <button
                    type="button"
                    onClick={handleSafeClose}
                    style={{
                      padding: '0.65rem 1.25rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '8px',
                      color: '#CBD5E1',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Save as Draft & Close
                  </button>
                  <button
                    type="button"
                    disabled={submitting || isExpired || getMissingMandatoryRequirements().length > 0}
                    onClick={handleFinalSubmit}
                    style={{
                      padding: '0.65rem 1.75rem',
                      background:
                        isExpired
                          ? 'rgba(239, 68, 68, 0.2)'
                          : getMissingMandatoryRequirements().length > 0
                          ? 'rgba(255, 255, 255, 0.08)'
                          : 'linear-gradient(135deg, #10B981, #059669)',
                      border: isExpired ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
                      borderRadius: '8px',
                      color: isExpired ? '#FCA5A5' : getMissingMandatoryRequirements().length > 0 ? '#64748B' : '#FFFFFF',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: submitting || isExpired || getMissingMandatoryRequirements().length > 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      boxShadow:
                        isExpired || getMissingMandatoryRequirements().length > 0 ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.35)',
                    }}
                  >
                    {submitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Submitting Application...
                      </>
                    ) : isExpired ? (
                      <>
                        Submissions Closed (Deadline Passed)
                      </>
                    ) : (
                      <>
                        Submit Final Application <CheckCircle size={16} />
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

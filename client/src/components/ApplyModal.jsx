import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  Upload,
  CheckCircle,
  FileText,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { submitApplication } from '../services/api';

export default function ApplyModal({ scholarship, user, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [sop, setSop] = useState('');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!scholarship) return null;

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selected]);
    }
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!sop.trim()) {
      setError('Please provide a brief Statement of Purpose or motivation essay.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await submitApplication(
        {
          scholarship_id: scholarship.scholarship_id,
          sop,
          annual_income: user?.academics?.family_annual_income || 450000,
          cgpa: user?.academics?.cgpa || 8.5,
        },
        files
      );

      // Trigger celebratory confetti effect!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setStep(4); // Success step
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to submit application. Please check fields.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel-elevated animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        {step !== 4 && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1.25rem',
              right: '1.25rem',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-full)',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={18} />
          </button>
        )}

        {/* Modal Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.75rem', color: '#818CF8', fontWeight: 700, textTransform: 'uppercase' }}>
            Application Submission
          </div>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {scholarship.title || scholarship.name || 'Scholarship Application'}
          </h2>
        </div>

        {/* Multi-step progress bar */}
        {step !== 4 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
            {['1. Academic Profile', '2. Statement of Purpose', '3. Documents'].map((lbl, idx) => {
              const currentIdx = idx + 1;
              const isDone = step > currentIdx;
              const isCurrent = step === currentIdx;

              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div style={{
                    height: '4px',
                    borderRadius: '2px',
                    background: isDone ? '#10B981' : isCurrent ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    transition: 'background var(--transition-normal)',
                  }} />
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: isCurrent ? 'var(--text-primary)' : isDone ? '#10B981' : 'var(--text-muted)',
                  }}>
                    {lbl}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#FCA5A5',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Academic Profile Confirmation */}
        {step === 1 && (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Confirm your academic metrics from your enrolled university records. These will be verified against official university transcripts during the review process.
            </p>

            <div style={{
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              padding: '1.25rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Student Name</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name || 'Aarav Sharma'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Roll / UID</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.academics?.student_uid || 'ENG2023-CS-042'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Department & Major</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.academics?.department || 'Computer Science & Engineering'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current CGPA</div>
                <div style={{ fontWeight: 700, color: '#34D399', fontSize: '1.1rem' }}>
                  {user?.academics?.cgpa || '8.95'} / 10.0
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Family Annual Income</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  ₹{(user?.academics?.family_annual_income || 420000).toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Degree Level</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user?.academics?.degree_level || 'Undergraduate (Year 3)'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={onClose} className="btn btn-secondary">
                Cancel
              </button>
              <button onClick={() => setStep(2)} className="btn btn-primary">
                Next: Statement of Purpose <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Statement of Purpose */}
        {step === 2 && (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Explain your academic motivation, career goals, and how this scholarship award will support your education.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Statement of Purpose / Motivation Essay *
              </label>
              <textarea
                rows={7}
                placeholder="Describe your research interests, projects, financial situation, or career trajectory..."
                value={sop}
                onChange={(e) => setSop(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                <span>Minimum recommended: 50 words</span>
                <span>{sop.trim().split(/\s+/).filter(Boolean).length} words</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <button onClick={() => setStep(1)} className="btn btn-secondary">
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={() => {
                  if (sop.trim().length < 15) {
                    setError('Please write at least a few sentences describing your statement of purpose.');
                    return;
                  }
                  setError('');
                  setStep(3);
                }}
                className="btn btn-primary"
              >
                Next: Attach Documents <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Document Uploads & Submission */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Upload verification documents (PDF, JPG, PNG). Files are stored securely in MongoDB GridFS / secure repository.
            </p>

            {/* Upload Dropzone */}
            <div
              style={{
                border: '2px dashed var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                background: 'rgba(15, 23, 42, 0.4)',
                marginBottom: '1.25rem',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload size={32} color="#818CF8" style={{ margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Click or drag files to upload
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Mark sheets, income certificates, faculty recommendations (Max 5MB each)
              </div>
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {/* File list preview */}
            {files.length > 0 && (
              <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {files.map((f, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} color="#06B6D4" />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{f.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({Math.round(f.size / 1024)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      style={{ background: 'transparent', color: '#EF4444', padding: '2px' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
              <button onClick={() => setStep(2)} className="btn btn-secondary" disabled={submitting}>
                <ArrowLeft size={16} /> Back
              </button>
              <button
                onClick={handleSubmit}
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? 'Submitting Application...' : 'Submit Final Application'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Success Confetti View */}
        {step === 4 && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#10B981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 0 24px rgba(16, 185, 129, 0.3)',
            }}>
              <CheckCircle size={36} />
            </div>

            <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              Application Successfully Submitted!
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              Your application for <strong>{scholarship.title || scholarship.name}</strong> has been assigned to the scholarship scrutiny committee. You can track progress live in your Student Dashboard.
            </p>

            <button
              onClick={onClose}
              className="btn btn-primary btn-lg"
              style={{ minWidth: '200px' }}
            >
              Go to Dashboard <Sparkles size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

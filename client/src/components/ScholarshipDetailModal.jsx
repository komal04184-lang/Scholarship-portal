import React from 'react';
import {
  X,
  Award,
  Calendar,
  Users,
  GraduationCap,
  FileCheck,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

export default function ScholarshipDetailModal({ scholarship, onClose, onApply }) {
  if (!scholarship) return null;

  const title = scholarship.title || scholarship.name || 'Scholarship Award';
  const category = scholarship.category || scholarship.eligible_category || 'Merit';
  const department = scholarship.department || scholarship.eligible_course || 'All Departments';
  const amount = parseFloat(scholarship.amount || 0);
  const total_slots = scholarship.total_slots || 30;
  const available_slots = scholarship.available_slots || Math.round(total_slots * 0.6);
  const min_gpa = scholarship.min_gpa !== undefined && scholarship.min_gpa !== null ? parseFloat(scholarship.min_gpa) : (scholarship.minimum_cgpa ? parseFloat(scholarship.minimum_cgpa) : null);
  const max_income = scholarship.max_income !== undefined && scholarship.max_income !== null ? parseFloat(scholarship.max_income) : (scholarship.maximum_income ? parseFloat(scholarship.maximum_income) : null);
  const deadline = scholarship.deadline;
  const description = scholarship.description || 'University scholarship grant providing financial assistance.';
  const disbursement_type = scholarship.disbursement_type || 'Annual';
  const eligibility_criteria = scholarship.eligibility_criteria;
  const required_documents = scholarship.required_documents;

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

  const deadlineDate = deadline ? new Date(deadline) : new Date();
  const formattedDeadline = deadlineDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
          maxWidth: '720px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
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

        {/* Category Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.2rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            background: 'var(--accent-primary-light)',
            color: '#818CF8',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            textTransform: 'uppercase',
          }}>
            {category} SCHOLARSHIP
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            · {department}
          </span>
        </div>

        {/* Title */}
        <h2 style={{ fontSize: '1.65rem', marginBottom: '1rem', lineHeight: 1.3 }}>
          {title}
        </h2>

        {/* Award Highlight Banner */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          padding: '1.25rem',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem',
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Grant Value</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34D399' }}>
              {formattedAmount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{disbursement_type || 'One-time'}</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Seats</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60A5FA' }}>
              {available_slots || total_slots} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {total_slots}</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Sanctioned Quota</div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Application Deadline</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#F59E0B', marginTop: '0.35rem' }}>
              {formattedDeadline}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Submissions close 11:59 PM</div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>About the Scholarship</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
            {description}
          </p>
        </div>

        {/* Eligibility Criteria Breakdown */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Eligibility Criteria</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {min_gpa && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span>Minimum Cumulative GPA: <strong style={{ color: '#F8FAFC' }}>{min_gpa} / 10.0</strong></span>
              </div>
            )}
            {max_income && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span>Family Annual Income: <strong style={{ color: '#F8FAFC' }}>≤ ₹{(max_income / 100000).toFixed(1)} Lakhs</strong></span>
              </div>
            )}
            {eligibility_criteria?.degree_level && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={16} color="#10B981" />
                <span>Degree Level: <strong style={{ color: '#F8FAFC' }}>{Array.isArray(eligibility_criteria.degree_level) ? eligibility_criteria.degree_level.join(', ') : eligibility_criteria.degree_level}</strong></span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <CheckCircle2 size={16} color="#10B981" />
              <span>Full-time Enrolled University Student</span>
            </div>
          </div>
        </div>

        {/* Required Documents Checklist */}
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>Mandatory Verification Documents</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {(required_documents || ['Grade Sheet', 'Income Proof', 'Government ID', 'SOP']).map((doc, idx) => (
              <span
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <FileCheck size={14} color="#06B6D4" />
                {doc}
              </span>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <button onClick={onClose} className="btn btn-secondary">
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onApply(scholarship);
            }}
            className="btn btn-primary"
          >
            Apply for this Award <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

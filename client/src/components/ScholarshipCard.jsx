import React from 'react';
import {
  Calendar,
  Award,
  Users,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Building2,
} from 'lucide-react';

export default function ScholarshipCard({
  scholarship,
  onSelect,
  onApply,
  userProfile,
}) {
  const sTitle = scholarship.title || scholarship.name || 'Scholarship Award';
  const sCategory = scholarship.category || scholarship.eligible_category || 'Merit';
  const sDept = scholarship.department || scholarship.eligible_course || 'All Disciplines';
  const sAmount = parseFloat(scholarship.amount || 0);
  const sMinGpa = scholarship.min_gpa !== undefined && scholarship.min_gpa !== null ? parseFloat(scholarship.min_gpa) : (scholarship.minimum_cgpa ? parseFloat(scholarship.minimum_cgpa) : null);
  const sMaxIncome = scholarship.max_income !== undefined && scholarship.max_income !== null ? parseFloat(scholarship.max_income) : (scholarship.maximum_income ? parseFloat(scholarship.maximum_income) : null);

  // Format amount
  const formattedAmount = sAmount > 0
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(sAmount) + ' / year'
    : 'Various benefits';

  // Format deadline date
  const deadlineDate = scholarship.deadline ? new Date(scholarship.deadline) : null;
  const formattedDeadline = deadlineDate && !isNaN(deadlineDate.getTime())
    ? deadlineDate.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Not specified';

  // Check eligibility if user has academic info
  let isEligible = true;
  let eligibilityReason = 'Eligible';

  if (userProfile?.academics) {
    const userGpa = parseFloat(userProfile.academics.cgpa || 0);
    const userIncome = parseFloat(userProfile.academics.family_annual_income || 0);

    if (sMinGpa && userGpa < sMinGpa) {
      isEligible = false;
      eligibilityReason = `Requires Min CGPA ${sMinGpa} (Yours: ${userGpa})`;
    } else if (sMaxIncome && userIncome > sMaxIncome) {
      isEligible = false;
      eligibilityReason = `Income exceeds limit (₹${(sMaxIncome / 100000).toFixed(1)}L)`;
    }
  }

  // Provider label / name
  const providerName = scholarship.department
    ? `${scholarship.department} Directorate`
    : 'National Higher Education Board';
  const locationLabel = scholarship.eligible_course
    ? `Eligible: ${scholarship.eligible_course}`
    : 'Location: All India';

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '14px',
        padding: '1.4rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
        cursor: 'default',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 10px 24px rgba(15, 23, 42, 0.08)';
        e.currentTarget.style.borderColor = '#CBD5E1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(15, 23, 42, 0.04)';
        e.currentTarget.style.borderColor = '#E2E8F0';
      }}
    >
      <div>
        {/* Top Provider Tag (Mint badge as in screenshot) */}
        <div style={{ marginBottom: '1rem' }}>
          <span style={{
            display: 'inline-block',
            fontSize: '0.74rem',
            fontWeight: 600,
            padding: '0.22rem 0.65rem',
            borderRadius: '6px',
            background: '#E6F4EA',
            color: '#0D6832',
            letterSpacing: '0.01em',
          }}>
            {sCategory ? `${sCategory} scheme` : 'Independent provider'}
          </span>
        </div>

        {/* 2-Column Details: Grant & Deadline (Exactly as in screenshot) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1rem',
          marginBottom: '1rem',
        }}>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 500, marginBottom: '0.15rem' }}>
              Grant
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A' }}>
              {formattedAmount}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 500, marginBottom: '0.15rem' }}>
              Deadline
            </div>
            <div style={{ fontSize: '0.96rem', fontWeight: 600, color: '#334155' }}>
              {formattedDeadline}
            </div>
          </div>
        </div>

        {/* Scholarship Title (Bold as in screenshot) */}
        <h3
          onClick={() => onSelect(scholarship)}
          style={{
            fontSize: '1.18rem',
            fontWeight: 700,
            color: '#0F172A',
            lineHeight: 1.35,
            marginBottom: '0.75rem',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#0E62C9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#0F172A'; }}
        >
          {sTitle}
        </h3>

        {/* Tags (e.g. Merit based, STEM, etc.) */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.85rem' }}>
          <span style={{
            fontSize: '0.73rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '4px',
            background: '#F1F5F9',
            color: '#475569',
            fontWeight: 500,
          }}>
            {sCategory} based
          </span>
          {sMinGpa && (
            <span style={{
              fontSize: '0.73rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '4px',
              background: '#F1F5F9',
              color: '#475569',
              fontWeight: 500,
            }}>
              Min CGPA: {sMinGpa}
            </span>
          )}
          {sDept && (
            <span style={{
              fontSize: '0.73rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '4px',
              background: '#F1F5F9',
              color: '#475569',
              fontWeight: 500,
            }}>
              {sDept}
            </span>
          )}
        </div>

        {/* "Read more about eligibility ->" link */}
        <div style={{ marginBottom: '1.15rem' }}>
          <span
            onClick={() => onSelect(scholarship)}
            style={{
              fontSize: '0.86rem',
              fontWeight: 600,
              color: '#0E62C9',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            Read more about eligibility →
          </span>
        </div>
      </div>

      {/* Bottom Section: Classical University Pillar Icon + Organization Name + Apply Button */}
      <div style={{
        borderTop: '1px solid #F1F5F9',
        paddingTop: '0.95rem',
        marginTop: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
      }}>
        {/* Classical Column Pillar Icon & Name (As shown in screenshot) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#94A3B8',
            flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16" />
              <path d="M6 6v12" />
              <path d="M10 6v12" />
              <path d="M14 6v12" />
              <path d="M18 6v12" />
              <path d="M3 18h18" />
              <path d="M2 21h20" />
              <path d="M12 3L3 6h18L12 3z" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.79rem', fontWeight: 600, color: '#334155', lineHeight: 1.25 }}>
              {providerName}
            </div>
            <div style={{ fontSize: '0.71rem', color: '#94A3B8' }}>
              {locationLabel}
            </div>
          </div>
        </div>

        {/* Apply Button */}
        <button
          onClick={() => onApply(scholarship)}
          className="btn btn-primary btn-sm"
          style={{
            fontSize: '0.84rem',
            padding: '0.45rem 0.95rem',
            borderRadius: '6px',
            flexShrink: 0,
          }}
        >
          Apply Now
        </button>
      </div>
    </div>
  );
}

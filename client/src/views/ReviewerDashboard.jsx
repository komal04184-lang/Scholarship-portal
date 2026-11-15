import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Search,
  Eye,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  CheckSquare,
  Users,
  Award,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import {
  getStoredToken,
  getReviewByApplicationId,
  verifyReviewDocuments,
  updateReviewEligibility,
  submitReviewDecision,
  createReviewRecord,
} from '../services/api';

async function fetchReviews(statusFilter) {
  try {
    const token = getStoredToken();
    const url = statusFilter && statusFilter !== 'ALL'
      ? `/api/reviews?status=${statusFilter}`
      : '/api/reviews';
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
  } catch {
    return [];
  }
}

export default function ReviewerDashboard({ user }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedReview, setSelectedReview] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // For review form
  const [decision, setDecision] = useState('');
  const [decisionRemarks, setDecisionRemarks] = useState('');
  const [eligibilityRemarks, setEligibilityRemarks] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    const data = await fetchReviews(statusFilter);
    setReviews(data);
    setLoading(false);
  };

  useEffect(() => { loadReviews(); }, [statusFilter]);

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleVerifyDoc = async (docName, status) => {
    if (!selectedReview) return;
    setActionLoading(true);
    try {
      const updated = await verifyReviewDocuments(selectedReview.id, [
        { name: docName, status, remarks: status === 'REJECTED' ? 'Rejected by reviewer' : '' },
      ]);
      setSelectedReview(updated);
      showMsg(`Document "${docName}" marked as ${status}`);
    } catch (e) {
      showMsg(e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetEligibility = async (eligible) => {
    if (!selectedReview) return;
    setActionLoading(true);
    try {
      const updated = await updateReviewEligibility(selectedReview.id, eligible, eligibilityRemarks);
      setSelectedReview(updated);
      showMsg(`Eligibility set to ${eligible ? 'ELIGIBLE' : 'INELIGIBLE'}`);
    } catch (e) {
      showMsg(e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecision = async () => {
    if (!decision) { showMsg('Please select a decision', 'error'); return; }
    if (!selectedReview) return;
    setActionLoading(true);
    try {
      await submitReviewDecision(selectedReview.id, decision, decisionRemarks, user?.name || user?.email || 'reviewer');
      showMsg(`Decision "${decision}" recorded successfully`);
      setSelectedReview(null);
      setDecision('');
      setDecisionRemarks('');
      loadReviews();
    } catch (e) {
      showMsg(e.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const map = {
      PENDING: '#F59E0B',
      DOCUMENTS_UNDER_REVIEW: '#3B82F6',
      ELIGIBILITY_VERIFIED: '#10B981',
      ELIGIBILITY_FAILED: '#EF4444',
      APPROVED: '#10B981',
      REJECTED: '#EF4444',
      CORRECTION_REQUIRED: '#F59E0B',
    };
    return map[status] || '#6B7280';
  };

  const statusOptions = ['ALL', 'PENDING', 'DOCUMENTS_UNDER_REVIEW', 'ELIGIBILITY_VERIFIED', 'APPROVED', 'REJECTED'];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '10px',
            background: '#EBF3FE', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#0E62C9',
          }}>
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
              Reviewer Dashboard
            </h1>
            <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>
              Review scholarship applications and verify documents
            </p>
          </div>
        </div>
      </div>

      {/* Alert */}
      {message && (
        <div style={{
          padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem',
          background: message.type === 'error' ? '#FEF2F2' : '#F0FDF4',
          border: `1px solid ${message.type === 'error' ? '#FCA5A5' : '#86EFAC'}`,
          color: message.type === 'error' ? '#B91C1C' : '#15803D',
        }}>
          {message.text}
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Reviews', value: reviews.length, icon: <ClipboardList size={18} />, color: '#0E62C9' },
          { label: 'Pending', value: reviews.filter(r => r.status === 'PENDING').length, icon: <Clock size={18} />, color: '#F59E0B' },
          { label: 'Approved', value: reviews.filter(r => r.status === 'APPROVED').length, icon: <CheckCircle size={18} />, color: '#10B981' },
          { label: 'Rejected', value: reviews.filter(r => r.status === 'REJECTED').length, icon: <XCircle size={18} />, color: '#EF4444' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: '#fff', borderRadius: '12px', padding: '1.25rem',
            border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <div style={{ color: stat.color }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A' }}>{stat.value}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748B' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedReview ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
        {/* Review List */}
        <div>
          <div style={{
            background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                Application Reviews
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{
                    padding: '0.35rem 0.75rem', borderRadius: '6px',
                    border: '1px solid #CBD5E1', fontSize: '0.8rem', color: '#0F172A',
                  }}
                >
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={loadReviews}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  <RefreshCw size={16} />
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '0.5rem' }}>Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                <ClipboardList size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p>No reviews found</p>
                <p style={{ fontSize: '0.8rem' }}>Reviews appear here when applications are submitted</p>
              </div>
            ) : (
              <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {reviews.map(review => (
                  <div
                    key={review.id}
                    onClick={() => { setSelectedReview(review); setDecision(''); setDecisionRemarks(''); }}
                    style={{
                      padding: '1rem 1.25rem',
                      borderBottom: '1px solid #F1F5F9',
                      cursor: 'pointer',
                      background: selectedReview?.id === review.id ? '#EBF3FE' : '#fff',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.9rem' }}>
                          App: {review.applicationId?.slice(0, 12)}...
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.2rem' }}>
                          Student: {review.studentId?.slice(0, 12)}...
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                          Docs: {review.documents?.length || 0}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                        <span style={{
                          fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.5rem',
                          borderRadius: '4px', background: `${getStatusColor(review.status)}20`,
                          color: getStatusColor(review.status),
                        }}>
                          {review.status}
                        </span>
                        <ChevronRight size={14} color="#CBD5E1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Review Detail Panel */}
        {selectedReview && (
          <div>
            <div style={{
              background: '#fff', borderRadius: '12px', border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '1rem 1.25rem', borderBottom: '1px solid #E2E8F0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Review Details
                </h2>
                <button
                  onClick={() => setSelectedReview(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', fontSize: '1.2rem' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '1.25rem', maxHeight: '600px', overflowY: 'auto' }}>
                {/* Info */}
                <div style={{ marginBottom: '1.25rem', background: '#F8FAFC', borderRadius: '8px', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '0.25rem' }}>Application ID</div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', wordBreak: 'break-all' }}>
                    {selectedReview.applicationId}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#64748B' }}>Status</div>
                  <span style={{
                    fontSize: '0.78rem', fontWeight: 700, padding: '0.2rem 0.5rem',
                    borderRadius: '4px', background: `${getStatusColor(selectedReview.status)}20`,
                    color: getStatusColor(selectedReview.status),
                  }}>
                    {selectedReview.status}
                  </span>
                </div>

                {/* Documents */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                    Documents ({selectedReview.documents?.length || 0})
                  </h3>
                  {!selectedReview.documents?.length ? (
                    <p style={{ fontSize: '0.8rem', color: '#94A3B8' }}>No documents attached</p>
                  ) : (
                    selectedReview.documents.map((doc, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.5rem', borderRadius: '6px', border: '1px solid #E2E8F0',
                        marginBottom: '0.5rem', background: '#fff',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FileText size={14} color="#64748B" />
                          <span style={{ fontSize: '0.82rem', color: '#0F172A' }}>{doc.name}</span>
                          <span style={{
                            fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '3px',
                            background: doc.status === 'VERIFIED' ? '#D1FAE5' : doc.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                            color: doc.status === 'VERIFIED' ? '#065F46' : doc.status === 'REJECTED' ? '#991B1B' : '#92400E',
                          }}>
                            {doc.status || 'PENDING'}
                          </span>
                        </div>
                        {!selectedReview.decision && (
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            <button
                              onClick={() => handleVerifyDoc(doc.name, 'VERIFIED')}
                              disabled={actionLoading}
                              style={{
                                padding: '0.2rem 0.4rem', borderRadius: '4px', border: 'none',
                                background: '#D1FAE5', color: '#065F46', cursor: 'pointer', fontSize: '0.7rem',
                              }}
                            >✓ Verify</button>
                            <button
                              onClick={() => handleVerifyDoc(doc.name, 'REJECTED')}
                              disabled={actionLoading}
                              style={{
                                padding: '0.2rem 0.4rem', borderRadius: '4px', border: 'none',
                                background: '#FEE2E2', color: '#991B1B', cursor: 'pointer', fontSize: '0.7rem',
                              }}
                            >✕ Reject</button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Eligibility */}
                {!selectedReview.decision && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                      Eligibility Decision
                    </h3>
                    <input
                      placeholder="Eligibility remarks (optional)"
                      value={eligibilityRemarks}
                      onChange={e => setEligibilityRemarks(e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem', borderRadius: '6px',
                        border: '1px solid #CBD5E1', fontSize: '0.82rem', marginBottom: '0.5rem',
                        boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleSetEligibility(true)}
                        disabled={actionLoading || selectedReview.eligible === true}
                        style={{
                          flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none',
                          background: selectedReview.eligible === true ? '#D1FAE5' : '#F0FDF4',
                          color: '#065F46', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                        }}
                      >
                        ✓ Mark Eligible
                      </button>
                      <button
                        onClick={() => handleSetEligibility(false)}
                        disabled={actionLoading || selectedReview.eligible === false}
                        style={{
                          flex: 1, padding: '0.5rem', borderRadius: '6px', border: 'none',
                          background: selectedReview.eligible === false ? '#FEE2E2' : '#FFF5F5',
                          color: '#991B1B', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                        }}
                      >
                        ✕ Mark Ineligible
                      </button>
                    </div>
                    {selectedReview.eligible !== null && selectedReview.eligible !== undefined && (
                      <div style={{
                        marginTop: '0.5rem', fontSize: '0.78rem', padding: '0.4rem 0.6rem',
                        borderRadius: '4px',
                        background: selectedReview.eligible ? '#D1FAE5' : '#FEE2E2',
                        color: selectedReview.eligible ? '#065F46' : '#991B1B',
                      }}>
                        Current: {selectedReview.eligible ? '✓ Eligible' : '✕ Ineligible'}
                        {selectedReview.eligibilityRemarks && ` — ${selectedReview.eligibilityRemarks}`}
                      </div>
                    )}
                  </div>
                )}

                {/* Final Decision */}
                {!selectedReview.decision ? (
                  <div>
                    <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                      Final Decision
                    </h3>
                    <select
                      value={decision}
                      onChange={e => setDecision(e.target.value)}
                      style={{
                        width: '100%', padding: '0.5rem', borderRadius: '6px',
                        border: '1px solid #CBD5E1', fontSize: '0.82rem', marginBottom: '0.5rem',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="">-- Select Decision --</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                      <option value="CORRECTION_REQUIRED">CORRECTION REQUIRED</option>
                    </select>
                    <textarea
                      placeholder="Decision remarks..."
                      value={decisionRemarks}
                      onChange={e => setDecisionRemarks(e.target.value)}
                      rows={2}
                      style={{
                        width: '100%', padding: '0.5rem', borderRadius: '6px',
                        border: '1px solid #CBD5E1', fontSize: '0.82rem', resize: 'vertical',
                        marginBottom: '0.75rem', boxSizing: 'border-box',
                      }}
                    />
                    <button
                      onClick={handleDecision}
                      disabled={actionLoading || !decision}
                      style={{
                        width: '100%', padding: '0.6rem', borderRadius: '8px', border: 'none',
                        background: decision ? '#0E62C9' : '#E2E8F0',
                        color: decision ? '#fff' : '#94A3B8',
                        cursor: decision ? 'pointer' : 'not-allowed',
                        fontWeight: 700, fontSize: '0.875rem',
                      }}
                    >
                      {actionLoading ? 'Submitting...' : 'Submit Decision'}
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: '0.75rem', borderRadius: '8px',
                    background: selectedReview.decision === 'APPROVED' ? '#D1FAE5' : '#FEE2E2',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      Final Decision: {selectedReview.decision}
                    </div>
                    {selectedReview.decisionRemarks && (
                      <div style={{ fontSize: '0.8rem', marginTop: '0.25rem', opacity: 0.8 }}>
                        {selectedReview.decisionRemarks}
                      </div>
                    )}
                    {selectedReview.reviewedBy && (
                      <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7 }}>
                        by {selectedReview.reviewedBy}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

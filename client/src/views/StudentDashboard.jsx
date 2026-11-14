import React, { useState, useEffect } from 'react';
import {
  User,
  GraduationCap,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,
  ExternalLink,
  PlusCircle,
  Bell,
  Edit3,
  Award,
  DollarSign,
  Briefcase,
  RefreshCw,
  Download,
  X,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import {
  getStudentApplications,
  getStudentProfile,
  updateStudentProfile,
  getApplicationTracking,
  getApplicationDocuments,
  withdrawApplication,
} from '../services/api';

export default function StudentDashboard({ onBrowseScholarships }) {
  const [profile, setProfile] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Profile Edit modal
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [phone, setPhone] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [income, setIncome] = useState('');
  const [category, setCategory] = useState('General');
  const [course, setCourse] = useState('');
  const [stateName, setStateName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedApp?.raw_id) {
      loadTrackingAndDocuments(selectedApp.raw_id);
    } else {
      setTracking(null);
      setDocuments([]);
    }
  }, [selectedApp?.raw_id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profData, appsData] = await Promise.all([
        getStudentProfile(),
        getStudentApplications(),
      ]);
      setProfile(profData);
      setApplications(appsData);
      if (appsData.length > 0) {
        setSelectedApp(appsData[0]);
      }

      setPhone(profData.phone || '');
      setCgpa(profData.academics?.cgpa || '');
      setIncome(profData.academics?.family_annual_income || '');
      setCategory(profData.academics?.category || 'General');
      setCourse(profData.academics?.degree_level || profData.academics?.department || '');
      setStateName(profData.state || '');
    } catch (err) {
      console.error('Error loading student dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTrackingAndDocuments = async (appId) => {
    setTrackingLoading(true);
    try {
      const [trackingData, docsData] = await Promise.all([
        getApplicationTracking(appId),
        getApplicationDocuments(appId),
      ]);
      setTracking(trackingData);
      setDocuments(docsData);
    } catch (err) {
      console.warn('Error loading tracking/documents:', err);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!selectedApp?.raw_id) return;
    if (!window.confirm('Are you sure you want to withdraw this application? This action cannot be undone.')) return;
    setWithdrawing(true);
    try {
      await withdrawApplication(selectedApp.raw_id, 'Withdrawn by student via portal');
      await loadData();
      alert('Application withdrawn successfully.');
    } catch (err) {
      alert('Could not withdraw: ' + err.message);
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    try {
      await updateStudentProfile({
        phone,
        cgpa: parseFloat(cgpa),
        family_annual_income: parseInt(income, 10),
        category,
        course,
        state: stateName,
      });

      setProfile((prev) => ({
        ...prev,
        phone,
        state: stateName,
        academics: {
          ...prev.academics,
          cgpa: parseFloat(cgpa),
          family_annual_income: parseInt(income, 10),
          category,
          degree_level: course,
        },
      }));
      setIsEditingProfile(false);
    } catch (err) {
      alert('Error updating profile: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading student records...
      </div>
    );
  }

  const academics = profile?.academics || {};

  // Build timeline from either tracking API data or fallback from application data
  const timeline = tracking?.timeline?.length > 0
    ? tracking.timeline.map((h) => ({
        status: h.status,
        title: `Status: ${h.status.replace(/_/g, ' ')}`,
        date: h.timestamp ? new Date(h.timestamp).toLocaleDateString() : '—',
        note: h.comment || h.changed_by ? `By ${h.changed_by || 'System'}` : '',
      }))
    : (selectedApp?.review_timeline || []);

  const progressPct = tracking?.progress_percentage ?? null;
  const canWithdraw = selectedApp && ['DRAFT', 'SUBMITTED', 'DOCUMENTS_REQUIRED', 'RESUBMISSION_REQUIRED', 'CORRECTION_REQUIRED'].includes(selectedApp?.status);

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>
      {/* Student Profile Overview Card */}
      <div className="glass-panel-elevated" style={{ padding: '2rem', marginBottom: '2.5rem', position: 'relative' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '20px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.75rem',
              fontWeight: 800,
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
            }}>
              {profile?.name ? profile.name.charAt(0) : 'S'}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                <h1 style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>
                  {profile?.name || 'Student Account'}
                </h1>
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.6rem',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34D399',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                }}>
                  Verified Student
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <span>UID: <strong style={{ color: 'var(--text-primary)' }}>{academics.student_uid || 'ENG2023-CS-042'}</strong></span>
                <span>·</span>
                <span>{academics.department || 'Computer Science & Engineering'}</span>
                <span>·</span>
                <span>{profile?.email}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setIsEditingProfile(true)}
              className="btn btn-secondary btn-sm"
            >
              <Edit3 size={15} /> Edit Profile
            </button>
            <button
              onClick={onBrowseScholarships}
              className="btn btn-primary btn-sm"
            >
              <PlusCircle size={15} /> Apply New
            </button>
          </div>
        </div>
      </div>

      {/* Quick Academic Indicators */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginTop: '1.75rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Cumulative CGPA</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34D399' }}>
            {academics.cgpa || '8.95'} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 10.0</span>
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Family Annual Income</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#60A5FA' }}>
            ₹{(academics.family_annual_income || 420000).toLocaleString('en-IN')}
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Program & Year</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {academics.degree_level || 'B.Tech'} (Year {academics.current_year || 3})
          </div>
        </div>

        <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Applications</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#A78BFA' }}>
            {applications.length} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Applications List + Live Progress Tracker */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.4fr)', gap: '1.75rem' }}>
        {/* Left Column: My Applications List */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              My Applications ({applications.length})
            </h2>
          </div>

          {applications.length === 0 ? (
            <div className="glass-panel" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
              <FileText size={40} color="var(--text-muted)" style={{ margin: '0 auto 0.75rem' }} />
              <h4 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>No applications submitted yet</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Explore open scholarships and apply before the semester deadline.
              </p>
              <button onClick={onBrowseScholarships} className="btn btn-primary btn-sm">
                Browse Scholarships
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {applications.map((app) => {
                const isSelected = selectedApp?.application_id === app.application_id;

                return (
                  <div
                    key={app.application_id}
                    className="glass-panel"
                    onClick={() => setSelectedApp(app)}
                    style={{
                      padding: '1.25rem',
                      cursor: 'pointer',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-glass)',
                      boxShadow: isSelected ? '0 0 15px rgba(99, 102, 241, 0.2)' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                        {app.application_id}
                      </span>
                      <StatusBadge status={app.status} />
                    </div>

                    <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                      {app.scholarship_title}
                    </h4>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span>Grant: <strong style={{ color: '#34D399' }}>₹{(app.award_amount || 0).toLocaleString('en-IN')}</strong></span>
                      <span>Submitted: {new Date(app.submitted_at || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Tracker of Selected Application */}
        <div>
          {selectedApp ? (
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#818CF8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Application Tracking #{selectedApp.application_id}
                  </span>
                  <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                    {selectedApp.scholarship_title}
                  </h3>
                </div>
                <StatusBadge status={selectedApp.status} size="lg" />
              </div>

              {/* Progress bar */}
              {progressPct !== null && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    <span>Application Progress</span>
                    <span style={{ color: progressPct >= 90 ? '#34D399' : 'var(--accent-primary)' }}>{progressPct}%</span>
                  </div>
                  <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: '3px',
                      width: `${progressPct}%`,
                      background: progressPct >= 90 ? '#34D399' : 'var(--accent-gradient)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  {tracking?.next_step && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                      Next: {tracking.next_step}
                    </div>
                  )}
                </div>
              )}

              {/* Step progression diagram */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: 'var(--radius-md)',
                padding: '1.5rem',
                border: '1px solid var(--border-subtle)',
                marginBottom: '1.75rem',
              }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem', textTransform: 'uppercase' }}>
                  Verification & Review Progression{trackingLoading && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem' }}>Loading...</span>}
                </h4>

                {/* Vertical timeline items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {(timeline.length > 0 ? timeline : [{ status: 'SUBMITTED', title: 'Application Submitted', date: new Date(selectedApp.submitted_at || Date.now()).toLocaleDateString(), note: 'Submitted via ApexScholar portal.' }]).map((t, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-full)',
                        background: 'rgba(16, 185, 129, 0.2)',
                        border: '2px solid #10B981',
                        color: '#10B981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <CheckCircle size={14} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.date}</span>
                        </div>
                        {t.note && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{t.note}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Applicant Statement of Purpose */}
              {selectedApp.sop && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    Statement of Purpose Submitted
                  </h4>
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                  }}>
                    {selectedApp.sop}
                  </div>
                </div>
              )}

              {/* Uploaded Documents from Application Service */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
                  Attached Documents ({documents.length || selectedApp.documents?.length || 0})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {(documents.length > 0 ? documents : (selectedApp.documents || [])).map((doc, idx) => {
                    const fileName = doc.original_filename || doc.name || `Document ${idx + 1}`;
                    const isVerified = doc.verification_status === 'VERIFIED' || doc.verified;
                    return (
                      <div
                        key={doc.id || doc.application_document_id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.6rem 0.85rem',
                          background: 'rgba(255, 255, 255, 0.04)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <FileText size={16} color="#06B6D4" />
                        <div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 500 }}>{fileName}</div>
                          <div style={{ fontSize: '0.7rem', color: isVerified ? '#34D399' : 'var(--text-muted)' }}>{doc.mime_type || doc.size || ''} · {isVerified ? '✓ Verified' : 'Pending Verification'}</div>
                        </div>
                      </div>
                    );
                  })}
                  {documents.length === 0 && (selectedApp.documents?.length || 0) === 0 && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No documents uploaded yet.</span>
                  )}
                </div>
              </div>

              {/* Withdraw action */}
              {canWithdraw && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing}
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      color: '#FCA5A5',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      cursor: withdrawing ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    <X size={14} /> {withdrawing ? 'Withdrawing...' : 'Withdraw Application'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select an application on the left to track its review status.
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
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
          onClick={() => setIsEditingProfile(false)}
        >
          <div
            className="glass-panel-elevated animate-fade-in"
            style={{ width: '100%', maxWidth: '480px', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.3rem', marginBottom: '1.25rem' }}>Update Academic Profile</h3>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Cumulative CGPA (out of 10.0)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={cgpa}
                  onChange={(e) => setCgpa(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Family Annual Income (₹)</label>
                <input
                  type="number"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Social Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                  <option value="EWS">EWS</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>Degree Course / Branch</label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech Computer Science"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>State of Domicile</label>
                <input
                  type="text"
                  placeholder="e.g. Karnataka"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsEditingProfile(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

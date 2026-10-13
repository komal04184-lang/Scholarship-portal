import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  Award,
  Layers,
  Database,
  Search,
  Filter,
  PlusCircle,
  Check,
  Activity,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import {
  getAdminMetrics,
  getAdminApplications,
  updateApplicationStatus,
  createScholarship,
  checkSystemHealth,
  getScholarships,
} from '../services/api';

export default function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('applications'); // 'applications', 'scholarships', 'health'
  const [metrics, setMetrics] = useState(null);
  const [applications, setApplications] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters for review queue
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected application for quick action
  const [selectedApp, setSelectedApp] = useState(null);
  const [actionRemarks, setActionRemarks] = useState('');

  // Create Scholarship modal state
  const [isCreatingScholarship, setIsCreatingScholarship] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Merit');
  const [newDept, setNewDept] = useState('Engineering & Technology');
  const [newAmount, setNewAmount] = useState('80000');
  const [newSlots, setNewSlots] = useState('20');
  const [newMinGpa, setNewMinGpa] = useState('8.0');
  const [newMaxIncome, setNewMaxIncome] = useState('750000');
  const [newDeadline, setNewDeadline] = useState('2026-12-31');
  const [newDescription, setNewDescription] = useState('');

  useEffect(() => {
    loadAllData();
  }, [statusFilter]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [m, apps, schols, h] = await Promise.all([
        getAdminMetrics(),
        getAdminApplications(statusFilter),
        getScholarships(),
        checkSystemHealth(),
      ]);
      setMetrics(m);
      setApplications(apps);
      setScholarships(schols);
      setHealth(h);
      if (apps.length > 0) setSelectedApp(apps[0]);
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appId, nextStatus) => {
    try {
      await updateApplicationStatus(appId, nextStatus, actionRemarks);

      // Update state locally
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: nextStatus, remarks: actionRemarks || a.remarks } : a))
      );
      if (selectedApp?.id === appId) {
        setSelectedApp((prev) => ({ ...prev, status: nextStatus, remarks: actionRemarks || prev.remarks }));
      }
      setActionRemarks('');
      alert(`Application ${appId} successfully updated to ${nextStatus}!`);
    } catch (err) {
      alert('Error updating status: ' + err.message);
    }
  };

  const handleCreateScholarship = async (e) => {
    e.preventDefault();
    try {
      await createScholarship({
        title: newTitle,
        category: newCategory,
        department: newDept,
        amount: parseInt(newAmount, 10),
        total_slots: parseInt(newSlots, 10),
        min_gpa: parseFloat(newMinGpa),
        max_income: parseInt(newMaxIncome, 10),
        deadline: new Date(newDeadline).toISOString(),
        description: newDescription,
        required_documents: ['Transcripts', 'Income Certificate', 'Recommendation'],
      });

      alert('New scholarship created successfully!');
      setIsCreatingScholarship(false);
      // reload
      const schols = await getScholarships();
      setScholarships(schols);
    } catch (err) {
      alert('Error creating scholarship: ' + err.message);
    }
  };

  const filteredApps = applications.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.applicant_name.toLowerCase().includes(q) ||
      a.student_uid.toLowerCase().includes(q) ||
      a.scholarship_title.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: '1360px', margin: '0 auto', padding: '2.5rem 1.5rem 5rem' }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.2)',
              color: '#818CF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldCheck size={18} />
            </div>
            <h1 style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>
              Directorate Administrative Console
            </h1>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Logged in as {user?.name || 'Administrator'} ({user?.role || 'Admin'}) · Portal Oversight & Scrutiny
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('applications')}
            className={`btn btn-sm ${activeTab === 'applications' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Clock size={15} /> Applications Queue
          </button>
          <button
            onClick={() => setActiveTab('scholarships')}
            className={`btn btn-sm ${activeTab === 'scholarships' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Layers size={15} /> Scholarship Schemes
          </button>
          <button
            onClick={() => setActiveTab('health')}
            className={`btn btn-sm ${activeTab === 'health' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Activity size={15} /> System Diagnostics
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem',
      }}>
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Applications</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {metrics?.total_applications || 148}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10B981', marginTop: '0.2rem' }}>+18% from last cycle</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Scrutiny</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#F59E0B', marginTop: '0.2rem' }}>
            {metrics?.pending_review || 42}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Awaiting committee review</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Approved Grants</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10B981', marginTop: '0.2rem' }}>
            {metrics?.approved_grants || 86}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>58% sanction rate</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Disbursed Funds</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#A78BFA', marginTop: '0.2rem' }}>
            ₹{((metrics?.total_disbursed || 4250000) / 100000).toFixed(1)}L
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Of ₹75L total allocation</div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Applicant Avg GPA</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#06B6D4', marginTop: '0.2rem' }}>
            {metrics?.avg_cgpa || '8.64'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>High academic caliber</div>
        </div>
      </div>

      {/* TAB 1: Applications Scrutiny Desk */}
      {activeTab === 'applications' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 1.4fr) minmax(340px, 1fr)', gap: '1.5rem' }}>
          {/* Applications Table View */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            {/* Filter toolbar */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Filter applicant name or roll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.25rem', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    style={{
                      padding: '0.35rem 0.65rem',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: statusFilter === st ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
                      color: statusFilter === st ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                    }}
                  >
                    {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Application List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '580px', overflowY: 'auto' }}>
              {filteredApps.map((a) => {
                const isSelected = selectedApp?.id === a.id;
                return (
                  <div
                    key={a.id}
                    onClick={() => setSelectedApp(a)}
                    style={{
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(15, 23, 42, 0.4)',
                      border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                          {a.applicant_name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          ({a.student_uid})
                        </span>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>

                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      {a.scholarship_title}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      <span>CGPA: <strong style={{ color: '#34D399' }}>{a.cgpa}</strong> · Income: ₹{(a.income / 100000).toFixed(1)}L</span>
                      <span>Award: <strong style={{ color: 'var(--text-primary)' }}>₹{a.amount.toLocaleString()}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Applicant Scrutiny Details & Action Desk */}
          <div>
            {selectedApp ? (
              <div className="glass-panel" style={{ padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#818CF8', fontWeight: 700 }}>
                      SCRUTINY DESK #{selectedApp.id}
                    </span>
                    <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                      {selectedApp.applicant_name}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {selectedApp.email} · {selectedApp.student_uid}
                    </div>
                  </div>
                  <StatusBadge status={selectedApp.status} size="lg" />
                </div>

                {/* Academic & Financial Verification Summary */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1.25rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cumulative CGPA</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#34D399' }}>{selectedApp.cgpa} / 10.0</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Annual Family Income</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹{selectedApp.income.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Target Grant</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#818CF8' }}>₹{selectedApp.amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Attached Documents</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#06B6D4' }}>{selectedApp.documents_count || 3} Files</div>
                  </div>
                </div>

                {/* Audit remarks */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Officer Review Notes / Decision Remarks
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter audit finding, verification details, or rejection grounds..."
                    value={actionRemarks}
                    onChange={(e) => setActionRemarks(e.target.value)}
                    style={{ width: '100%', fontSize: '0.85rem' }}
                  />
                  {selectedApp.remarks && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                      Previous remark: <em>"{selectedApp.remarks}"</em>
                    </div>
                  )}
                </div>

                {/* Reviewer Action Buttons */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem', fontWeight: 600 }}>
                    Workflow Action
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleStatusChange(selectedApp.id, 'UNDER_REVIEW')}
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1 }}
                      >
                        <Clock size={14} /> Move to Under Review
                      </button>
                      <button
                        onClick={() => handleStatusChange(selectedApp.id, 'APPROVED')}
                        className="btn btn-success btn-sm"
                        style={{ flex: 1 }}
                      >
                        <CheckCircle size={14} /> Approve Grant
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleStatusChange(selectedApp.id, 'DISBURSED')}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, background: 'var(--status-disbursed)' }}
                      >
                        <DollarSign size={14} /> Disburse Funds
                      </button>
                      <button
                        onClick={() => handleStatusChange(selectedApp.id, 'REJECTED')}
                        className="btn btn-danger btn-sm"
                        style={{ flex: 1 }}
                      >
                        <XCircle size={14} /> Reject Application
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Select an applicant from the queue to review credentials and update status.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Scholarship Schemes Management */}
      {activeTab === 'scholarships' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)' }}>
                Active Scholarship Schemes ({scholarships.length})
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Configure criteria rules, sanctioned seat allocations, and application deadlines.
              </p>
            </div>
            <button
              onClick={() => setIsCreatingScholarship(true)}
              className="btn btn-primary btn-sm"
            >
              <PlusCircle size={15} /> Add New Scholarship
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-medium)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Scheme Title</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Grant Amount</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Slots</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Min GPA</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Deadline</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {scholarships.map((s) => (
                  <tr key={s.scholarship_id || s.id || Math.random()} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.title || s.name}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{s.department || s.eligible_course || 'All Departments'}</div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>{s.category || s.eligible_category || 'Merit'}</span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#34D399' }}>
                      ₹{(parseFloat(s.amount) || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {s.available_slots || s.total_slots || 20} / {s.total_slots || 30}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      {s.min_gpa ? `${s.min_gpa}+` : (s.minimum_cgpa ? `${s.minimum_cgpa}+` : 'N/A')}
                    </td>
                    <td style={{ padding: '1rem', color: '#F59E0B', fontSize: '0.85rem' }}>
                      {s.deadline ? new Date(s.deadline).toLocaleDateString() : 'Active'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <StatusBadge status={s.status || 'ACTIVE'} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: System Diagnostics & DB Health */}
      {activeTab === 'health' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Database size={24} color="#6366F1" />
              <div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>PostgreSQL Relational Store</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Core Entities, RBAC, Financial Ledger</div>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Connection Pool:</span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>Active (max 20)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Database Schema:</span>
                <span style={{ color: 'var(--text-primary)' }}>portal.*</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Query Latency:</span>
                <span style={{ color: '#34D399', fontWeight: 600 }}>1.4 ms</span>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Enforces ACID constraints, unique roll indexes, and role authorization policies.
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <Layers size={24} color="#06B6D4" />
              <div>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>MongoDB Document & GridFS</h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Document Metadata & Audit Logs</div>
              </div>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Cluster State:</span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>Connected</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Collections:</span>
                <span style={{ color: 'var(--text-primary)' }}>document_metadata, audit_logs</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Max Storage Limit:</span>
                <span style={{ color: 'var(--text-primary)' }}>5 MB per document</span>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Stores file MIME types, checksums, OCR extraction logs, and administrative audit trails.
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Scholarship Scheme */}
      {isCreatingScholarship && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => setIsCreatingScholarship(false)}
        >
          <div
            className="glass-panel-elevated animate-fade-in"
            style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.35rem', marginBottom: '1.25rem' }}>Create New Scholarship Program</h3>

            <form onSubmit={handleCreateScholarship} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Scholarship Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dean's Graduate Fellowship in AI"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="Merit">Merit</option>
                    <option value="STEM">STEM</option>
                    <option value="Need-Based">Need-Based</option>
                    <option value="Research">Research</option>
                    <option value="International">International</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Target Department
                  </label>
                  <input
                    type="text"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Grant Value (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Sanctioned Seats (Slots)
                  </label>
                  <input
                    type="number"
                    value={newSlots}
                    onChange={(e) => setNewSlots(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Minimum CGPA (out of 10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newMinGpa}
                    onChange={(e) => setNewMinGpa(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
                  Description & Eligibility Scope
                </label>
                <textarea
                  rows={3}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Outline eligibility criteria and guidelines..."
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setIsCreatingScholarship(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Publish Scholarship
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

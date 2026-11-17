import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  ShieldCheck,
  User,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Search,
  ArrowLeft,
  FileCheck,
  Settings,
} from 'lucide-react';

export default function Navbar({
  activeTab,
  setActiveTab,
  onNavigate,
  onOpenAuth,
  canGoBack,
  onGoBack,
}) {
  const { user, isAdmin, isReviewer, isStudent, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleNav = (tab) => {
    if (onNavigate) {
      onNavigate(tab);
    } else if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  const handleBrandClick = () => {
    if (isAdmin) {
      handleNav('admin');
    } else if (isReviewer || user?.role === 'reviewer') {
      handleNav('reviewer');
    } else {
      handleNav('catalog');
    }
  };

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 60,
      background: '#FFFFFF',
      borderBottom: '1px solid #E5E7EB',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
    }}>
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
      }}>
        {/* Left: Back Button + Studyportals-style Classical Pillar Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {canGoBack && (
            <button
              onClick={onGoBack}
              title="Go back to previous page"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                cursor: 'pointer',
                color: '#1E293B',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#E2E8F0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F1F5F9';
              }}
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div
            onClick={handleBrandClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {/* Stylized Classical University Pillar Icon */}
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0E62C9 0%, #1D4ED8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 2px 6px rgba(14, 98, 201, 0.3)',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 6h16" />
                <path d="M4 10h16" />
                <path d="M6 10v9" />
                <path d="M10 10v9" />
                <path d="M14 10v9" />
                <path d="M18 10v9" />
                <path d="M3 19h18" />
                <path d="M2 22h20" />
                <path d="M12 2L3 6h18L12 2z" />
              </svg>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '1.3rem',
                  color: '#0E62C9',
                  letterSpacing: '-0.02em',
                }}>
                  ApexScholar
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: '#FA541C',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  Portals
                </span>
              </div>
              <div style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 500 }}>
                {isAdmin ? 'Directorate Administration Desk' : isReviewer ? 'Review & Verification Desk' : 'Higher Education & Scholarships'}
              </div>
            </div>
          </div>
        </div>

        {/* Center: Educational Portal Navigation OR Officer Desk Navigation */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          fontSize: '0.92rem',
          fontWeight: 500,
          color: '#334155',
        }}>
          {isAdmin ? (
            /* Admin Specific Center Nav */
            <>
              <div
                onClick={() => handleNav('admin')}
                style={{
                  cursor: 'pointer',
                  fontWeight: activeTab === 'admin' ? 700 : 500,
                  color: activeTab === 'admin' ? '#0E62C9' : '#334155',
                  borderBottom: activeTab === 'admin' ? '2px solid #0E62C9' : '2px solid transparent',
                  paddingBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <LayoutDashboard size={15} />
                <span>Scholarship Schemes</span>
              </div>
              <div
                onClick={() => handleNav('admin')}
                style={{
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <FileCheck size={15} />
                <span>Scrutiny Desk</span>
              </div>
              <div
                onClick={() => handleNav('admin')}
                style={{
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Settings size={15} />
                <span>Auditing & Logs</span>
              </div>
            </>
          ) : isReviewer ? (
            /* Reviewer Specific Center Nav */
            <>
              <div
                onClick={() => handleNav('reviewer')}
                style={{
                  cursor: 'pointer',
                  fontWeight: activeTab === 'reviewer' ? 700 : 500,
                  color: activeTab === 'reviewer' ? '#0E62C9' : '#334155',
                  borderBottom: activeTab === 'reviewer' ? '2px solid #0E62C9' : '2px solid transparent',
                  paddingBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <ShieldCheck size={15} />
                <span>Reviewer Desk</span>
              </div>
              <div
                onClick={() => handleNav('reviewer')}
                style={{
                  cursor: 'pointer',
                  fontWeight: 500,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <FileCheck size={15} />
                <span>Verification Queue</span>
              </div>
            </>
          ) : (
            /* Student & Public Center Nav */
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: '#334155' }}>
                <span>Programmes</span>
                <ChevronDown size={14} color="#64748B" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: '#334155' }}>
                <span>Universities</span>
                <ChevronDown size={14} color="#64748B" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: '#334155' }}>
                <span>Countries</span>
                <ChevronDown size={14} color="#64748B" />
              </div>

              <div
                onClick={() => handleNav('catalog')}
                style={{
                  cursor: 'pointer',
                  fontWeight: activeTab === 'catalog' ? 700 : 500,
                  color: activeTab === 'catalog' ? '#0E62C9' : '#334155',
                  borderBottom: activeTab === 'catalog' ? '2px solid #0E62C9' : '2px solid transparent',
                  paddingBottom: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                }}
              >
                <span>Scholarships</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', color: '#334155' }}>
                <span>Resources</span>
                <ChevronDown size={14} color="#64748B" />
              </div>
            </>
          )}
        </nav>

        {/* Right Section: Login / Officer Portal / Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {/* Direct Dashboard Link */}
              {isStudent && (
                <button
                  onClick={() => handleNav('student')}
                  className={`btn btn-sm ${activeTab === 'student' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ gap: '0.4rem', borderRadius: 'var(--radius-full)' }}
                >
                  <GraduationCap size={15} /> My Dashboard
                </button>
              )}

              {isReviewer && (
                <button
                  onClick={() => handleNav('reviewer')}
                  className={`btn btn-sm ${activeTab === 'reviewer' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ gap: '0.4rem', borderRadius: 'var(--radius-full)' }}
                >
                  <ShieldCheck size={15} /> Reviewer Desk
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => handleNav('admin')}
                  className={`btn btn-sm ${activeTab === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ gap: '0.4rem', borderRadius: 'var(--radius-full)' }}
                >
                  <ShieldCheck size={15} /> Admin Desk
                </button>
              )}

              {/* User Identity Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.75rem',
                background: '#F1F5F9',
                borderRadius: 'var(--radius-full)',
                border: '1px solid #E2E8F0',
              }}>
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: isStudent ? '#0E62C9' : '#0284C7',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0F172A' }}>
                    {user.name || user.email || 'User'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#64748B', textTransform: 'capitalize' }}>
                    {user.role}
                  </div>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                onClick={() => {
                  logout();
                  handleNav('catalog');
                }}
                className="btn btn-secondary btn-sm"
                title="Sign Out"
                style={{
                  borderRadius: 'var(--radius-full)',
                  padding: '0.38rem 0.7rem',
                  fontSize: '0.8rem',
                  color: '#DC2626',
                  borderColor: '#FEE2E2',
                  background: '#FEF2F2',
                }}
              >
                <LogOut size={13} /> Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Dedicated Reviewer Portal Link Button */}
              <button
                onClick={() => handleNav('reviewer-login')}
                className="btn btn-secondary btn-sm"
                style={{
                  borderRadius: 'var(--radius-full)',
                  padding: '0.45rem 0.95rem',
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderColor: '#BAE6FD',
                  color: '#0369A1',
                  background: '#F0F9FF',
                }}
              >
                <ShieldCheck size={15} color="#0284C7" />
                <span>Officer Login</span>
              </button>

              {/* ONE SINGLE LOGIN BUTTON as requested by user */}
              <button
                onClick={() => onOpenAuth('choose', null)}
                className="btn btn-outline btn-sm"
                style={{
                  borderRadius: 'var(--radius-full)',
                  padding: '0.45rem 1.15rem',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  borderColor: '#0E62C9',
                  color: '#0E62C9',
                  background: '#FFFFFF',
                  boxShadow: '0 1px 2px rgba(14, 98, 201, 0.08)',
                }}
              >
                <User size={15} color="#0E62C9" />
                <span>Sign up / Log in</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

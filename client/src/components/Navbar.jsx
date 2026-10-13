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
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, onOpenAuth }) {
  const { user, isAdmin, isStudent, isAuthenticated, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
        {/* Left: Studyportals-style Classical Pillar Brand Logo */}
        <div
          onClick={() => setActiveTab('catalog')}
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
              Higher Education & Scholarships
            </div>
          </div>
        </div>

        {/* Center: Educational Portal Navigation (Programmes, Universities, Countries, Scholarships, Resources) */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          fontSize: '0.92rem',
          fontWeight: 500,
          color: '#334155',
        }}>
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
            onClick={() => setActiveTab('catalog')}
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
        </nav>

        {/* Right Section: ONE Unified Login Button or Authenticated Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              {/* Direct Dashboard Link */}
              {isStudent && (
                <button
                  onClick={() => setActiveTab('student')}
                  className={`btn btn-sm ${activeTab === 'student' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ gap: '0.4rem', borderRadius: 'var(--radius-full)' }}
                >
                  <GraduationCap size={15} /> My Dashboard
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
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
                    {user.name || 'User'}
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
                  setActiveTab('catalog');
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
            /* ONE SINGLE LOGIN BUTTON as requested by user */
            <button
              onClick={() => onOpenAuth('choose', null)}
              className="btn btn-outline"
              style={{
                borderRadius: 'var(--radius-full)',
                padding: '0.5rem 1.15rem',
                fontSize: '0.9rem',
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
              <User size={16} color="#0E62C9" />
              <span>Sign up / Log in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

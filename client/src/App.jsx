import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import CatalogView from './views/CatalogView';
import StudentDashboard from './views/StudentDashboard';
import AdminDashboard from './views/AdminDashboard';
import AuthModal from './views/AuthModal';
import { GraduationCap, ShieldCheck, Database, Server, Code, Lock, User } from 'lucide-react';

function MainApp() {
  const { user, role, isAdmin, isStudent, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog', 'student', 'admin'
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState('choose');
  const [authTargetTab, setAuthTargetTab] = useState(null);

  const openAuth = (defaultTab = 'choose', targetTab = null) => {
    setAuthDefaultTab(defaultTab);
    setAuthTargetTab(targetTab || (defaultTab === 'choose' ? null : defaultTab));
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (authenticatedUser, loggedInTab) => {
    const target = authTargetTab || (loggedInTab === 'admin' ? 'admin' : 'student');
    setActiveTab(target);
    setAuthTargetTab(null);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F8F9FA' }}>
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={(tab, target) => openAuth(tab || 'choose', target)}
      />

      {/* Main View Area */}
      <main style={{ flex: 1 }}>
        {activeTab === 'catalog' && (
          <CatalogView
            user={user}
            onRequireAuth={() => openAuth('student', 'catalog')}
            onNavigateDashboard={() => {
              if (isAuthenticated && isStudent) {
                setActiveTab('student');
              } else {
                openAuth('student', 'student');
              }
            }}
          />
        )}

        {activeTab === 'student' && (
          isAuthenticated && isStudent ? (
            <StudentDashboard
              onBrowseScholarships={() => setActiveTab('catalog')}
            />
          ) : (
            <div style={{
              maxWidth: '520px',
              margin: '4rem auto',
              padding: '2.5rem',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: '#EBF3FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0E62C9',
                margin: '0 auto 1.25rem',
              }}>
                <GraduationCap size={30} />
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.6rem' }}>
                Student Sign In Required
              </h2>
              <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                Please sign in with your student credentials or register a new student account to track application statuses, milestones, and disbursements.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  onClick={() => openAuth('student', 'student')}
                  className="btn btn-primary"
                  style={{ minWidth: '160px' }}
                >
                  <User size={16} /> Sign In / Register
                </button>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="btn btn-secondary"
                >
                  Back to Scholarships
                </button>
              </div>
            </div>
          )
        )}

        {activeTab === 'admin' && (
          isAuthenticated && isAdmin ? (
            <AdminDashboard user={user} />
          ) : (
            <div style={{
              maxWidth: '520px',
              margin: '4rem auto',
              padding: '2.5rem',
              textAlign: 'center',
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: '#E0F2FE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0284C7',
                margin: '0 auto 1.25rem',
              }}>
                <ShieldCheck size={30} />
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.6rem' }}>
                Directorate Scrutiny Desk
              </h2>
              <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                Authorized officer access only. Please authenticate with your official credentials to inspect queues, verify certificates, and approve grants.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  onClick={() => openAuth('admin', 'admin')}
                  className="btn btn-primary"
                  style={{ minWidth: '160px' }}
                >
                  <ShieldCheck size={16} /> Sign In as Officer
                </button>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="btn btn-secondary"
                >
                  Back to Scholarships
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer style={{
        background: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        padding: '2.5rem 1.5rem 2rem',
        marginTop: 'auto',
      }}>
        <div style={{
          maxWidth: '1360px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1.5rem',
          paddingBottom: '1.5rem',
          borderBottom: '1px solid #E2E8F0',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '6px',
                background: '#0E62C9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}>
                <GraduationCap size={18} />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.15rem', color: '#0E62C9' }}>
                ApexScholar Portals
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: '#64748B', maxWidth: '420px', lineHeight: 1.5 }}>
              Higher education scholarship and financial aid management system with automated eligibility scrutiny and direct grant tracking.
            </p>
          </div>

          {/* Architecture badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748B', marginRight: '0.4rem' }}>Backend:</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0' }}>
              PostgreSQL
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0' }}>
              Node.js Express
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0' }}>
              SOAP & REST
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '4px', background: '#F1F5F9', color: '#334155', border: '1px solid #E2E8F0' }}>
              React + Vite
            </span>
          </div>
        </div>

        <div style={{
          maxWidth: '1360px',
          margin: '0 auto',
          paddingTop: '1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.8rem',
          color: '#94A3B8',
        }}>
          <div>© 2026 ApexScholar Portal. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>Security: JWT Bearer & RBAC</span>
            <span>REST API v1: /api/v1</span>
            <span>Database: Connected</span>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultTab={authDefaultTab}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

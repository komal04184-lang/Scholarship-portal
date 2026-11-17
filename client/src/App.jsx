import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import CatalogView from './views/CatalogView';
import StudentDashboard from './views/StudentDashboard';
import AdminDashboard from './views/AdminDashboard';
import ReviewerDashboard from './views/ReviewerDashboard';
import ReviewerLoginPage from './views/ReviewerLoginPage';
import AuthModal from './views/AuthModal';
import { GraduationCap, ShieldCheck, Database, Server, Code, Lock, User } from 'lucide-react';

function getInitialTab() {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    if (path === 'reviewer/login' || path === 'reviewer-login') return 'reviewer-login';
    if (path === 'admin') return 'admin';
    if (path === 'reviewer') return 'reviewer';
    if (path === 'student') return 'student';
    if (path === 'catalog') return 'catalog';
  }
  return 'catalog';
}

function MainApp() {
  const { user, role, isAdmin, isReviewer, isStudent, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [historyStack, setHistoryStack] = useState([]);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authDefaultTab, setAuthDefaultTab] = useState('choose');
  const [authTargetTab, setAuthTargetTab] = useState(null);

  const navigate = (tab, replace = false) => {
    if (tab === activeTab) return;
    if (!replace) {
      setHistoryStack((prev) => [...prev, activeTab]);
    }
    setActiveTab(tab);
    const url = tab === 'catalog' ? '/' : (tab === 'reviewer-login' ? '/reviewer/login' : `/${tab}`);
    if (replace) {
      window.history.replaceState({ tab }, '', url);
    } else {
      window.history.pushState({ tab }, '', url);
    }
  };

  const handleGoBack = () => {
    if (historyStack.length > 0) {
      const newStack = [...historyStack];
      const prevTab = newStack.pop();
      setHistoryStack(newStack);
      setActiveTab(prevTab);
      const url = prevTab === 'catalog' ? '/' : (prevTab === 'reviewer-login' ? '/reviewer/login' : `/${prevTab}`);
      window.history.pushState({ tab: prevTab }, '', url);
    } else {
      // Safe fallback role landing page: never leave site or log out
      if (isAdmin) {
        navigate('admin', true);
      } else if (isReviewer) {
        navigate('reviewer', true);
      } else {
        navigate('catalog', true);
      }
    }
  };

  // Sync with browser popstate
  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state && event.state.tab) {
        setActiveTab(event.state.tab);
      } else {
        const path = window.location.pathname.replace(/^\//, '').toLowerCase();
        if (path === 'reviewer/login' || path === 'reviewer-login') {
          setActiveTab('reviewer-login');
        } else if (['admin', 'reviewer', 'student', 'catalog'].includes(path)) {
          setActiveTab(path);
        } else {
          setActiveTab(isAdmin ? 'admin' : (isReviewer ? 'reviewer' : 'catalog'));
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAdmin, isReviewer]);

  // Role separation enforcement:
  // Admins must not be presented student catalogue or personal applications view by default.
  // Reviewers must be sent to reviewer desk.
  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin && (activeTab === 'catalog' || activeTab === 'student')) {
        navigate('admin', true);
      } else if (isReviewer && (activeTab === 'student' || activeTab === 'catalog')) {
        navigate('reviewer', true);
      }
    }
  }, [isAuthenticated, isAdmin, isReviewer, activeTab]);

  const openAuth = (defaultTab = 'choose', targetTab = null) => {
    setAuthDefaultTab(defaultTab);
    setAuthTargetTab(targetTab || (defaultTab === 'choose' ? null : defaultTab));
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (authenticatedUser, loggedInTab) => {
    let target = 'catalog';
    if (authenticatedUser?.role === 'admin' || loggedInTab === 'admin') {
      target = 'admin';
    } else if (authenticatedUser?.role === 'reviewer' || loggedInTab === 'reviewer') {
      target = 'reviewer';
    } else {
      target = authTargetTab || 'student';
    }
    navigate(target);
    setAuthTargetTab(null);
  };

  const canGoBack = historyStack.length > 0 || (activeTab !== 'catalog' && (isAdmin ? activeTab !== 'admin' : isReviewer ? activeTab !== 'reviewer' : true));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F8F9FA' }}>
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={navigate}
        onNavigate={navigate}
        canGoBack={canGoBack}
        onGoBack={handleGoBack}
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
                navigate('student');
              } else {
                openAuth('student', 'student');
              }
            }}
          />
        )}

        {/* Dedicated Reviewer / Officer Login Page */}
        {activeTab === 'reviewer-login' && (
          <ReviewerLoginPage
            onNavigate={navigate}
            onSuccess={(authenticatedUser) => {
              if (authenticatedUser.role === 'admin') {
                navigate('admin');
              } else {
                navigate('reviewer');
              }
            }}
          />
        )}

        {activeTab === 'student' && (
          isAuthenticated && isStudent ? (
            <StudentDashboard
              onBrowseScholarships={() => navigate('catalog')}
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
                  onClick={() => navigate('catalog')}
                  className="btn btn-secondary"
                >
                  Back to Scholarships
                </button>
              </div>
            </div>
          )
        )}

        {/* Reviewer Dashboard */}
        {activeTab === 'reviewer' && (
          isAuthenticated && (isReviewer || isAdmin) ? (
            <ReviewerDashboard user={user} />
          ) : (
            <div style={{ maxWidth: '520px', margin: '4rem auto', padding: '2.5rem', textAlign: 'center',
              background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
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
              <h2>Reviewer Sign In Required</h2>
              <p style={{ color: '#64748B', margin: '0.75rem 0 1.5rem' }}>Please sign in with authorized reviewer or officer credentials.</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button onClick={() => navigate('reviewer-login')} className="btn btn-primary">
                  Official Reviewer Login
                </button>
                <button onClick={() => navigate('catalog')} className="btn btn-secondary">
                  Back to Portal
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
                  onClick={() => navigate('reviewer-login')}
                  className="btn btn-primary"
                  style={{ minWidth: '160px' }}
                >
                  <ShieldCheck size={16} /> Official Officer Login
                </button>
                <button
                  onClick={() => navigate('catalog')}
                  className="btn btn-secondary"
                >
                  Back to Portal
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

          {/* Helpful portal links */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
            <button onClick={() => navigate('catalog')} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}>Browse Scholarships</button>
            <button onClick={() => navigate('reviewer-login')} style={{ background: 'none', border: 'none', color: '#0284C7', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}>Officer & Reviewer Desk</button>
            <button onClick={() => navigate('catalog')} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}>Eligibility Criteria</button>
            <button onClick={() => navigate('catalog')} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}>Guidelines</button>
            <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Support: helpdesk@scholarship.gov.in</span>
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
          <div>© 2026 ApexScholar Portal. All rights reserved. Online Higher Education Scholarship Management System.</div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span>Digital Portal</span>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
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

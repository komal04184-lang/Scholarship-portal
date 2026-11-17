import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReviewerLoginPage({ onNavigate, onSuccess }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail) {
      setError('Please provide your official institutional email.');
      return;
    }
    if (!cleanPass) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      // Authenticate via existing Identity Service endpoint with 'admin' role context (staff)
      const res = await login(cleanEmail, cleanPass, 'admin');
      const userRole = (res.user?.role || '').toLowerCase();

      // Check role strictly
      if (userRole === 'student') {
        throw new Error('Access denied: Student accounts are not authorized for the Reviewer / Officer Portal. Please use the Student Portal.');
      }

      if (onSuccess) {
        onSuccess(res.user);
      } else if (userRole === 'admin') {
        onNavigate('admin');
      } else {
        onNavigate('reviewer');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem 1rem',
      background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
    }}>
      <div style={{
        maxWidth: '460px',
        width: '100%',
        background: '#FFFFFF',
        borderRadius: '16px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
        border: '1px solid #E2E8F0',
        padding: '2.5rem',
      }}>
        {/* Back Link */}
        <button
          type="button"
          onClick={() => onNavigate('catalog')}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748B',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: 0,
            marginBottom: '1.75rem',
          }}
        >
          <ArrowLeft size={16} /> Back to Public Portal
        </button>

        {/* Branding & Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0E62C9 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            margin: '0 auto 1rem',
            boxShadow: '0 4px 12px rgba(14, 98, 201, 0.25)',
          }}>
            <ShieldCheck size={30} />
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
            Reviewer & Officer Desk
          </h1>
          <p style={{ fontSize: '0.86rem', color: '#64748B', marginTop: '0.4rem', lineHeight: 1.5 }}>
            Official portal for scholarship scrutiny, document verification, and award decisions
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem',
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '0.15rem' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Official Institutional Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                placeholder="officer@scholarship.gov.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.4rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />
              <Mail size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 2.4rem 0.65rem 2.4rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.92rem',
                  outline: 'none',
                }}
              />
              <Lock size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.8rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: '#0E62C9',
            }}
          >
            {loading ? 'Verifying Credentials...' : 'Sign In to Reviewer Desk'}
          </button>
        </form>

        <div style={{ marginTop: '1.75rem', textAlign: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
          <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: 0 }}>
            Protected by State Authentication & Role-Based Access Control (RBAC). Unauthorized access is strictly logged and audited.
          </p>
        </div>
      </div>
    </div>
  );
}

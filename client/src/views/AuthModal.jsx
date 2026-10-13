import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShieldCheck,
  Lock,
  Mail,
  Phone,
  AlertCircle,
  GraduationCap,
  Calendar,
  Building2,
  BookOpen,
  MapPin,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, defaultTab = 'choose', onSuccess }) {
  if (!isOpen) return null;

  const { login, register } = useAuth();

  // Selected role: 'choose', 'student', 'admin'
  const [selectedRole, setSelectedRole] = useState(defaultTab === 'admin' ? 'admin' : (defaultTab === 'student' ? 'student' : 'choose'));
  // Student auth mode: 'login' or 'register'
  const [studentMode, setStudentMode] = useState('login');

  // Login credentials
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Comprehensive Student Registration fields (actual student details as requested)
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('');
  const [stateName, setStateName] = useState('');
  const [city, setCity] = useState('');

  // Socio-economic details
  const [category, setCategory] = useState('General');
  const [annualIncome, setAnnualIncome] = useState('');
  const [familySize, setFamilySize] = useState('');

  // Academic details
  const [institutionName, setInstitutionName] = useState('');
  const [course, setCourse] = useState('B.Tech');
  const [branch, setBranch] = useState('Computer Science');
  const [semester, setSemester] = useState('5');
  const [cgpa, setCgpa] = useState('');
  const [passingYear, setPassingYear] = useState('2026');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (defaultTab === 'admin') {
      setSelectedRole('admin');
      setStudentMode('login');
    } else if (defaultTab === 'student') {
      setSelectedRole('student');
    } else {
      setSelectedRole('choose');
    }
    setError('');
  }, [defaultTab, isOpen]);

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(loginEmail, loginPassword, selectedRole);
      if (onSuccess) onSuccess(res.user, selectedRole);
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Student Registration submission
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const studentData = {
        name,
        email: regEmail,
        phone,
        password,
        confirmPassword,
        date_of_birth: dateOfBirth || null,
        gender,
        address: address || null,
        state: stateName || null,
        city: city || null,
        category,
        annual_income: annualIncome ? parseFloat(annualIncome) : null,
        family_size: familySize ? parseInt(familySize, 10) : null,
        institution_name: institutionName || null,
        course,
        branch,
        semester: semester ? parseInt(semester, 10) : 1,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        passing_year: passingYear ? parseInt(passingYear, 10) : 2026,
      };

      const res = await register(studentData);
      if (onSuccess) onSuccess(res.user, 'student');
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed. Please check the entered details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
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
          maxWidth: selectedRole === 'student' && studentMode === 'register' ? '680px' : '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2.25rem',
          position: 'relative',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          border: '1px solid #E2E8F0',
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
            background: '#F1F5F9',
            border: '1px solid #E2E8F0',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>

        {/* ========================================================================= */}
        {/* STEP 1: ROLE SELECTION MODAL ("when clicked then show admin or student") */}
        {/* ========================================================================= */}
        {selectedRole === 'choose' ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0E62C9 0%, #1D4ED8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                margin: '0 auto 0.85rem',
                boxShadow: '0 4px 12px rgba(14, 98, 201, 0.25)',
              }}>
                <GraduationCap size={28} />
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>
                Welcome to ApexScholar
              </h2>
              <p style={{ fontSize: '0.88rem', color: '#64748B' }}>
                Please choose your portal destination to proceed with authentication
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              {/* Option A: Student Portal */}
              <div
                onClick={() => {
                  setSelectedRole('student');
                  setStudentMode('login');
                  setError('');
                }}
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '2px solid #E2E8F0',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0E62C9';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(14, 98, 201, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#EBF3FE',
                  color: '#0E62C9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <User size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.2rem' }}>
                    Student Portal
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.35 }}>
                    Discover & apply for university scholarships, track applications, and view live disbursement milestones.
                  </div>
                </div>
                <ArrowRight size={18} color="#0E62C9" />
              </div>

              {/* Option B: Admin / Officer Desk */}
              <div
                onClick={() => {
                  setSelectedRole('admin');
                  setError('');
                }}
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: '2px solid #E2E8F0',
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0284C7';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(2, 132, 199, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '10px',
                  background: '#E0F2FE',
                  color: '#0284C7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <ShieldCheck size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.2rem' }}>
                    Admin / Officer Desk
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.35 }}>
                    Authorized scrutiny officers & directorate committee. Review student queues, inspect documents, and sanction grants.
                  </div>
                </div>
                <ArrowRight size={18} color="#0284C7" />
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#94A3B8' }}>
              University Grants & Scrutiny Portal · 2026-27 Session
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* STEP 2: AUTHENTICATION FORMS FOR STUDENT OR ADMIN                         */
          /* ========================================================================= */
          <div>
            {/* Top Switcher & Back Arrow */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setSelectedRole('choose')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'none',
                  border: 'none',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <ArrowLeft size={15} /> Switch Portal
              </button>

              {/* Role Indicator Pill */}
              <div style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
                borderRadius: 'var(--radius-full)',
                background: selectedRole === 'student' ? '#EBF3FE' : '#E0F2FE',
                color: selectedRole === 'student' ? '#0E62C9' : '#0284C7',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}>
                {selectedRole === 'student' ? <User size={13} /> : <ShieldCheck size={13} />}
                <span>{selectedRole === 'student' ? 'Student Portal' : 'Admin & Officer Desk'}</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.7rem 0.9rem',
                background: '#FEF2F2',
                border: '1px solid #FEE2E2',
                borderRadius: '8px',
                color: '#DC2626',
                fontSize: '0.83rem',
                marginBottom: '1.25rem',
              }}>
                <AlertCircle size={16} flexShrink={0} />
                <span>{error}</span>
              </div>
            )}

            {/* ---------------- STUDENT PORTAL ---------------- */}
            {selectedRole === 'student' && (
              <div>
                {/* Student Mode Switcher: Sign In vs Register */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  background: '#F1F5F9',
                  padding: '4px',
                  borderRadius: '8px',
                  marginBottom: '1.5rem',
                }}>
                  <button
                    type="button"
                    onClick={() => { setStudentMode('login'); setError(''); }}
                    style={{
                      padding: '0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      background: studentMode === 'login' ? '#FFFFFF' : 'transparent',
                      color: studentMode === 'login' ? '#0E62C9' : '#64748B',
                      boxShadow: studentMode === 'login' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      border: 'none',
                    }}
                  >
                    Student Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStudentMode('register'); setError(''); }}
                    style={{
                      padding: '0.55rem',
                      borderRadius: '6px',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      background: studentMode === 'register' ? '#FFFFFF' : 'transparent',
                      color: studentMode === 'register' ? '#0E62C9' : '#64748B',
                      boxShadow: studentMode === 'register' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      border: 'none',
                    }}
                  >
                    New Student Registration
                  </button>
                </div>

                {/* Sub-view A: Student Sign In */}
                {studentMode === 'login' && (
                  <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                        Student Email Address
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="email"
                          required
                          placeholder="e.g. rahul.sharma@university.edu"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          style={{ width: '100%', paddingLeft: '2.5rem' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                        Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="password"
                          required
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          style={{ width: '100%', paddingLeft: '2.5rem' }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
                      disabled={loading}
                    >
                      {loading ? 'Authenticating...' : 'Sign In to Student Portal'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.84rem', color: '#64748B' }}>
                      Don't have an account yet?{' '}
                      <span
                        onClick={() => setStudentMode('register')}
                        style={{ color: '#0E62C9', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Register as a student
                      </span>
                    </div>
                  </form>
                )}

                {/* Sub-view B: Comprehensive Student Registration (Real details requested) */}
                {studentMode === 'register' && (
                  <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* SECTION 1: Personal Information */}
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.35rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={15} color="#0E62C9" /> 1. Personal & Contact Information
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Rahul Sharma"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="student@example.com"
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Mobile Phone *
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="9876543210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Date of Birth *
                          </label>
                          <input
                            type="date"
                            required
                            value={dateOfBirth}
                            onChange={(e) => setDateOfBirth(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Gender
                          </label>
                          <select
                            value={gender}
                            onChange={(e) => setGender(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            State & City
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
                            <input
                              type="text"
                              placeholder="City"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              style={{ width: '100%', fontSize: '0.88rem' }}
                            />
                            <input
                              type="text"
                              placeholder="State"
                              value={stateName}
                              onChange={(e) => setStateName(e.target.value)}
                              style={{ width: '100%', fontSize: '0.88rem' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Password *
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="Min 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Confirm Password *
                          </label>
                          <input
                            type="password"
                            required
                            placeholder="Re-enter password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 2: Socio-Economic & Eligibility Details */}
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.35rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <DollarSign size={15} color="#0E62C9" /> 2. Category & Socio-Economic Details
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Category *
                          </label>
                          <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          >
                            <option value="General">General</option>
                            <option value="OBC">OBC</option>
                            <option value="SC">SC</option>
                            <option value="ST">ST</option>
                            <option value="EWS">EWS</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Annual Family Income (₹)
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 450000"
                            value={annualIncome}
                            onChange={(e) => setAnnualIncome(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Family Size
                          </label>
                          <input
                            type="number"
                            placeholder="e.g. 4"
                            value={familySize}
                            onChange={(e) => setFamilySize(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* SECTION 3: Academic Information */}
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.35rem', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <BookOpen size={15} color="#0E62C9" /> 3. Current Academic Information
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Institution / College Name *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. National Institute of Technology, Trichy"
                            value={institutionName}
                            onChange={(e) => setInstitutionName(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Degree / Course *
                          </label>
                          <select
                            value={course}
                            onChange={(e) => setCourse(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          >
                            <option value="B.Tech">B.Tech (Bachelor of Technology)</option>
                            <option value="M.Tech">M.Tech (Master of Technology)</option>
                            <option value="B.Sc">B.Sc (Bachelor of Science)</option>
                            <option value="M.Sc">M.Sc (Master of Science)</option>
                            <option value="MBA">MBA (Master of Business Admin)</option>
                            <option value="MBBS">MBBS (Medicine & Surgery)</option>
                            <option value="PhD">Ph.D. (Doctoral Research)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Branch / Specialization
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Computer Science & Engg"
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Current Semester
                          </label>
                          <select
                            value={semester}
                            onChange={(e) => setSemester(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                              <option key={s} value={s}>Semester {s}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '0.2rem' }}>
                            Current CGPA / Score *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="10"
                            required
                            placeholder="e.g. 8.65"
                            value={cgpa}
                            onChange={(e) => setCgpa(e.target.value)}
                            style={{ width: '100%', fontSize: '0.88rem' }}
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '0.8rem', marginTop: '0.5rem', fontSize: '0.96rem' }}
                      disabled={loading}
                    >
                      {loading ? 'Creating Student Profile in PostgreSQL...' : 'Submit & Register Student Account'}
                    </button>

                    <div style={{ textAlign: 'center', fontSize: '0.84rem', color: '#64748B' }}>
                      Already registered?{' '}
                      <span
                        onClick={() => setStudentMode('login')}
                        style={{ color: '#0E62C9', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Sign in here
                      </span>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ---------------- ADMIN & OFFICER DESK ---------------- */}
            {selectedRole === 'admin' && (
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '0.65rem 0.85rem', background: '#F0F9FF', borderRadius: '8px', border: '1px solid #BAE6FD', fontSize: '0.82rem', color: '#0369A1' }}>
                  <strong>Authorised Personnel:</strong> Committee scrutiny members, verification officers, and Directorate administrators.
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Officer Email Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      required
                      placeholder="admin@portal.com or reviewer@portal.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      style={{ width: '100%', paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                    Access Security Key / Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="password"
                      required
                      placeholder="Enter scrutiny desk password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      style={{ width: '100%', paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem', fontSize: '0.95rem' }}
                  disabled={loading}
                >
                  {loading ? 'Verifying Directorate Access...' : 'Sign In to Scrutiny Desk'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

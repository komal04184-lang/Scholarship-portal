/**
 * Unified API Client for ApexScholar
 * Interfaces directly with the Microservices Architecture (Application Service, Identity Service, Review Service).
 */

const API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api/v1';

// Seed Fallback Data (Mirroring the PostgreSQL & MongoDB database seed)
export const SEED_SCHOLARSHIPS = [
  {
    scholarship_id: 1,
    title: 'National Merit Scholarship',
    name: 'National Merit Scholarship',
    category: 'Merit',
    department: 'Engineering & Technology',
    amount: 75000,
    disbursement_type: 'One-time',
    total_slots: 25,
    available_slots: 12,
    min_gpa: 8.0,
    max_income: 800000,
    deadline: '2027-03-31T23:59:59Z',
    status: 'ACTIVE',
    description: 'A prestigious scholarship awarded to students demonstrating exceptional academic excellence across all disciplines. Supports meritorious students with outstanding CGPA.',
    eligibility_criteria: {
      degree_level: ['B.Tech', 'Undergraduate'],
      min_cgpa: 8.0,
      max_family_income: 800000,
      departments: ['Computer Science', 'Engineering'],
    },
    required_documents: ['Grade Sheet', 'Income Certificate', 'College ID Card'],
  },
  {
    scholarship_id: 2,
    title: 'Women in STEM Scholarship',
    name: 'Women in STEM Scholarship',
    category: 'STEM',
    department: 'Science & Engineering',
    amount: 100000,
    disbursement_type: 'Annual',
    total_slots: 15,
    available_slots: 7,
    min_gpa: 7.5,
    max_income: 600000,
    deadline: '2027-05-01T23:59:59Z',
    status: 'ACTIVE',
    description: 'An initiative to encourage women pursuing education in Science, Technology, Engineering, and Mathematics fields. Recognizes outstanding female students.',
    eligibility_criteria: {
      gender: 'Female',
      min_cgpa: 7.5,
      departments: ['B.Tech', 'Data Science', 'Physics'],
    },
    required_documents: ['Transcripts', 'Income Certificate', 'Admission Proof'],
  },
  {
    scholarship_id: 3,
    title: 'Need-Based Financial Aid',
    name: 'Need-Based Financial Aid',
    category: 'Need-Based',
    department: 'All Departments',
    amount: 45000,
    disbursement_type: 'Semester-wise',
    total_slots: 50,
    available_slots: 29,
    min_gpa: 5.0,
    max_income: 250000,
    deadline: '2027-04-30T23:59:59Z',
    status: 'ACTIVE',
    description: 'Financial assistance for students from economically disadvantaged families. Ensures financial constraints do not prevent talented students from accessing quality higher education.',
    eligibility_criteria: {
      max_family_income: 250000,
      min_cgpa: 5.0,
      departments: ['All'],
    },
    required_documents: ['Income Certificate', 'BPL Card', 'Academic Marksheet'],
  },
  {
    scholarship_id: 4,
    title: 'Post-Graduate Research Fellowship',
    name: 'Post-Graduate Research Fellowship',
    category: 'Research',
    department: 'Computer Science & AI',
    amount: 120000,
    disbursement_type: 'Quarterly',
    total_slots: 10,
    available_slots: 4,
    min_gpa: 7.0,
    max_income: 1000000,
    deadline: '2027-06-30T23:59:59Z',
    status: 'ACTIVE',
    description: 'A competitive fellowship for post-graduate students engaged in innovative research. Supports students pursuing MBA, M.Tech, or M.Sc with demonstrated research aptitude.',
    eligibility_criteria: {
      degree_level: ['Postgraduate', 'MBA', 'M.Tech'],
      min_cgpa: 7.0,
      departments: ['Computer Science', 'AI & Machine Learning'],
    },
    required_documents: ['Research Proposal', 'Faculty Recommendation', 'Academic Marksheet'],
  },
  {
    scholarship_id: 5,
    title: 'SC/ST Welfare Scholarship',
    name: 'SC/ST Welfare Scholarship',
    category: 'Need-Based',
    department: 'All Departments',
    amount: 50000,
    disbursement_type: 'One-time',
    total_slots: 30,
    available_slots: 18,
    min_gpa: 6.0,
    max_income: 300000,
    deadline: '2027-04-15T23:59:59Z',
    status: 'ACTIVE',
    description: 'Government-funded scholarship program designed to support students from Scheduled Castes and Scheduled Tribes. Promotes higher education accessibility.',
    eligibility_criteria: {
      min_cgpa: 6.0,
      eligible_category: 'SC',
      departments: ['All'],
    },
    required_documents: ['Caste Certificate', 'Income Certificate', 'Academic Marksheet', 'Aadhar Card Copy'],
  },
  {
    scholarship_id: 6,
    title: 'Engineering Excellence Scholarship',
    name: 'Engineering Excellence Scholarship',
    category: 'Merit',
    department: 'Engineering',
    amount: 80000,
    disbursement_type: 'Annual',
    total_slots: 20,
    available_slots: 11,
    min_gpa: 7.0,
    max_income: 700000,
    deadline: '2027-03-15T23:59:59Z',
    status: 'ACTIVE',
    description: 'Recognizes outstanding engineering students across all branches based on academic performance and technical project contributions.',
    eligibility_criteria: {
      min_cgpa: 7.0,
      eligible_course: 'B.Tech',
      departments: ['Engineering'],
    },
    required_documents: ['Academic Marksheet', 'College ID Card'],
  },
];

// Helper to deduce category from title/course
export function deriveCategory(name = '') {
  const n = String(name).toLowerCase();
  if (n.includes('stem') || n.includes('women')) return 'STEM';
  if (n.includes('need') || n.includes('welfare') || n.includes('aid')) return 'Need-Based';
  if (n.includes('research') || n.includes('fellowship')) return 'Research';
  if (n.includes('international') || n.includes('exchange')) return 'International';
  return 'Merit';
}

// Normalizer to ensure consistent scholarship shape across client
export function normalizeScholarship(s) {
  if (!s) return null;
  const title = s.title || s.name || 'Scholarship Program';
  const category = s.category || s.category_name || s.eligible_category || deriveCategory(title);
  const department = s.department || s.eligible_course || 'All Departments';
  const amount = parseFloat(s.award_amount ?? s.amount) || 0;
  const min_gpa = s.min_cgpa !== null && s.min_cgpa !== undefined
    ? parseFloat(s.min_cgpa)
    : (s.min_gpa !== null && s.min_gpa !== undefined ? parseFloat(s.min_gpa) : null);
  const max_income = s.max_income !== null && s.max_income !== undefined ? parseFloat(s.max_income) : null;
  const total_slots = s.total_slots ? parseInt(s.total_slots) : null;
  const available_slots = s.available_slots || (total_slots ? Math.round(total_slots * 0.6) : null);

  // Required documents: array of strings or objects
  let reqDocs = s.required_documents || [];
  if (Array.isArray(reqDocs) && reqDocs.length > 0 && typeof reqDocs[0] === 'object') {
    reqDocs = reqDocs.map(d => d.document_name || d.name || 'Document');
  }
  if (!Array.isArray(reqDocs) || reqDocs.length === 0) {
    reqDocs = ['Academic Marksheet', 'Income Certificate', 'College ID Card'];
  }

  const id = String(s.scholarship_id || s.id || '');
  const deadline = s.application_end_date || s.deadline || null;
  const status = s.status || 'open';

  return {
    ...s,
    scholarship_id: id,
    id,
    title,
    name: title,
    category,
    category_name: category,
    department,
    amount,
    award_amount: amount,
    min_gpa,
    min_cgpa: min_gpa,
    minimum_cgpa: min_gpa,
    max_income,
    maximum_income: max_income,
    total_slots,
    available_slots,
    deadline,
    application_end_date: deadline,
    status,
    description: s.description || 'University scholarship providing financial assistance and academic recognition.',
    disbursement_type: s.disbursement_type || 'Annual',
    required_documents: reqDocs,
    eligibility_criteria: s.eligibility_criteria || [],
  };
}

// Backend user ko frontend shape mein convert karta hai (username -> name, role lowercase)
export function normalizeUser(u) {
  if (!u) return null;
  return {
    ...u,
    id: u.id || u._id,
    name: u.name || u.username || '',
    role: (u.role || 'student').toLowerCase(),
  };
}

// Local storage keys
const TOKEN_KEY = 'apex_token';
const USER_KEY = 'apex_user';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuth(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) {
    const normalizedUser = {
      ...user,
      role: (user.role || 'student').toLowerCase(),
    };
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
  }
}

export function getStoredUser() {
  const u = localStorage.getItem(USER_KEY);
  if (!u) return null;
  try {
    const parsed = JSON.parse(u);
    if (parsed && parsed.role) {
      parsed.role = parsed.role.toLowerCase();
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}


// Fetch wrapper with cookie-based authentication
async function request(endpoint, options = {}) {
  const token = getStoredToken();
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // JSON requests ke liye Content-Type
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // FormData ke liye browser khud Content-Type set karega
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data.error || data.message || `Request failed (${res.status})`;

    throw new Error(message);
  }

  return data;
}


// ----------------------------------------------------
// Public & Scholarship APIs
// ----------------------------------------------------
export async function getScholarships(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.category && filters.category !== 'All') params.append('category', filters.category);
  if (filters.sortBy) params.append('sort_by', filters.sortBy);
  params.append('limit', '50');

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await request(`/scholarships${query}`);
  const rawList = res.items || res.scholarships || res.data || (Array.isArray(res) ? res : []);
  return rawList.map(normalizeScholarship);
}

export async function getScholarshipById(id) {
  const res = await request(`/scholarships/${id}`);
  const raw = res.scholarship || res.data || res;
  if (!raw) return null;
  const normalized = normalizeScholarship(raw);
  if (res.requiredDocuments && res.requiredDocuments.length > 0) {
    normalized.required_documents = res.requiredDocuments.map((d) => d.document_name);
  }
  return normalized;
}

// ----------------------------------------------------
// Authentication APIs
// ----------------------------------------------------
export async function loginApi(email, password) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim(),
      password: password.trim(),
    }),
  });

  const normalizedUser = normalizeUser(res.user);

  // User details and JWT token in localStorage + HTTP-only cookie
  setStoredAuth(res.token || null, normalizedUser);

  return {
    token: res.token || null,
    user: normalizedUser,
  };
}

export async function logoutApi() {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch (err) {
    console.warn('logoutApi error:', err.message);
  } finally {
    clearStoredAuth();
  }
}

export async function registerApi(userData) {
  const payload = {
    username: userData.username || userData.name,
    email: userData.email,
    password: userData.password,
    phone: userData.phone,
    date_of_birth: userData.date_of_birth,
    gender: userData.gender,
    address: userData.address || null,
    category: userData.category || null,

    family_income:
      userData.family_income ?? userData.annual_income ?? null,

    family_size: userData.family_size ?? null,

    state: userData.state || null,
    city: userData.city || null,

    academic_details: {
      institution_name: userData.institution_name || null,
      course: userData.course || null,
      branch: userData.branch || null,
      semester: userData.semester || null,
      cgpa: userData.cgpa ?? null,
      passing_year: userData.passing_year || null,
    },
  };

  const res = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const normalizedUser = normalizeUser(res.user);

  setStoredAuth(res.token || null, normalizedUser);

  return {
    token: res.token || null,
    user: normalizedUser,
  };
}

export async function getCurrentUser() {
  try {
    const res = await request('/profile/me');

    if (res.user) {
      const normalizedUser = normalizeUser(res.user);

      setStoredAuth(null, normalizedUser);

      return normalizedUser;
    }

    return null;
  } catch (err) {
    clearStoredAuth();
    return null;
  }
}

// ----------------------------------------------------
// Student APIs
// ----------------------------------------------------
export async function getStudentProfile() {
  // Backend: GET /api/v1/profile/me
  const res = await request('/profile/me');
  const u = res.user || {};
  const a = u.academic_details || {};
  const uid = String(u._id || u.id || '');

  return {
    student_id: uid,
    name: u.username || 'Student',
    email: u.email || '',
    phone: u.phone || '',
    address: u.address || '',
    state: u.state || '',
    city: u.city || '',
    gender: u.gender || 'Not Specified',
    date_of_birth: u.date_of_birth,
    academics: {
      student_uid: uid ? `STU-${uid.slice(-6).toUpperCase()}` : '',
      department: a.branch || a.course || '',
      major: a.branch || a.course || '',
      degree_level: a.course || '',
      current_year: a.semester ? Math.ceil(a.semester / 2) : null,
      cgpa: a.cgpa ?? null,
      family_annual_income: u.family_income ?? null,
      category: u.category || 'General',
    },
  };
}

// undefined / NaN / '' wali values backend ko nahi bhejte
function stripEmpty(obj) {
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== undefined && v !== '' && !(typeof v === 'number' && Number.isNaN(v))
    )
  );
}

export async function updateStudentProfile(profileData) {
  // Backend: PUT /api/v1/profile/me
  const payload = stripEmpty({
    username: profileData.name,
    phone: profileData.phone,
    address: profileData.address,
    gender: profileData.gender,
    date_of_birth: profileData.date_of_birth,
    family_income: profileData.family_annual_income ?? profileData.annual_income,
    category: profileData.category,
    state: profileData.state,
    city: profileData.city,
    academic_details: stripEmpty({
      institution_name: profileData.institution_name,
      course: profileData.course,
      branch: profileData.branch,
      semester: profileData.semester,
      cgpa: profileData.cgpa,
      passing_year: profileData.passing_year,
    }),
  });

  return request('/profile/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getStudentApplications() {
  try {
    const res = await request('/applications/my').catch(() => request('/applications'));
    const apps = res.data?.applications || res.applications || (Array.isArray(res.data) ? res.data : []);

    return apps.map((a) => {
      const appId = a.application_number || (a.application_id ? `APP-2026-00${a.application_id}` : 'APP-2026-001');
      const rawId = a.application_id || a.id;
      const status = a.status || 'SUBMITTED';

      return {
        application_id: appId,
        raw_id: rawId,
        scholarship_id: a.scholarship_id,
        scholarship_title: a.scholarship_name || a.scholarship?.name || a.scholarship_title || 'Scholarship Scheme',
        category: a.category || a.scholarship?.category || 'Merit',
        award_amount: parseFloat(a.amount || a.scholarship_amount || a.scholarship?.amount) || 50000,
        status,
        submitted_at: a.submitted_at || a.created_at || new Date().toISOString(),
        sop: a.sop || a.statement || 'Application submitted through online student portal with academic transcripts.',
        reviewer_name: a.reviewer_name || null,
        documents: a.documents || [
          { name: 'Academic_Transcript.pdf', size: '1.2 MB', verified: status === 'APPROVED' },
          { name: 'Income_Certificate.pdf', size: '850 KB', verified: status === 'APPROVED' },
        ],
        review_timeline: a.timeline || [
          { status: 'SUBMITTED', title: 'Application Submitted', date: new Date(a.submitted_at || Date.now()).toLocaleDateString(), note: 'Submitted via ApexScholar portal.' },
          ...(status === 'UNDER_REVIEW' || status === 'APPROVED' || status === 'REJECTED' || status === 'CORRECTION_REQUIRED'
            ? [{ status: 'UNDER_REVIEW', title: 'Review in Progress', date: 'In Review', note: a.reviewer_name ? `Assigned to ${a.reviewer_name}` : 'Scrutiny committee assigned.' }]
            : []),
          ...(status === 'CORRECTION_REQUIRED'
            ? [{ status: 'CORRECTION_REQUIRED', title: 'Correction Requested', date: new Date(a.updated_at || Date.now()).toLocaleDateString(), note: 'Applicant requested to update documentation.' }]
            : []),
          ...(status === 'APPROVED'
            ? [{ status: 'APPROVED', title: 'Grant Approved', date: new Date(a.updated_at || Date.now()).toLocaleDateString(), note: 'Eligible award sanctioned for disbursement.' }]
            : []),
          ...(status === 'REJECTED'
            ? [{ status: 'REJECTED', title: 'Application Rejected', date: new Date(a.updated_at || Date.now()).toLocaleDateString(), note: 'Eligibility criteria not met.' }]
            : []),
          ...(status === 'DISBURSED'
            ? [{ status: 'DISBURSED', title: 'Grant Disbursed', date: new Date(a.updated_at || Date.now()).toLocaleDateString(), note: 'Funds successfully transferred.' }]
            : []),
        ],
      };
    });
  } catch (err) {
    console.warn('getStudentApplications fallback:', err.message);
    return [];
  }
}

export async function submitApplication(appData, files = []) {
  try {
    const res = await request('/applications', {
      method: 'POST',
      body: JSON.stringify({
        // Send as string to support both integer IDs and string references
        scholarship_id: String(appData.scholarship_id),
        statement: appData.sop || appData.statement || 'Applied via student portal',
        sop: appData.sop || appData.statement || 'Applied via student portal',
        academic_year: appData.academic_year || '2026-2027',
      }),
    });

    const newApp = res.data?.application || res.application;

    // Upload files if any
    if (files.length > 0 && (newApp?.application_id || newApp?.id)) {
      const targetId = newApp.application_id || newApp.id;
      for (const file of files) {
        try {
          const fd = new FormData();
          fd.append('document', file);
          fd.append('document_type', file.name.split('.')[0] || 'Marksheet');
          await request(`/applications/${targetId}/documents`, {
            method: 'POST',
            body: fd,
          });
        } catch (fErr) {
          console.warn('Document upload warning:', fErr.message);
        }
      }
    }

    return res;
  } catch (err) {
    console.warn('submitApplication error:', err.message);
    throw err;
  }
}

/**
 * Create a DRAFT application (saves without submitting)
 */
export async function createDraftApplication(appData) {
  try {
    const res = await request('/applications/draft', {
      method: 'POST',
      body: JSON.stringify({
        scholarship_id: String(appData.scholarship_id),
        statement: appData.sop || appData.statement || '',
        sop: appData.sop || appData.statement || '',
        academic_year: appData.academic_year || '2026-2027',
      }),
    });
    return res;
  } catch (err) {
    console.warn('createDraftApplication error:', err.message);
    throw err;
  }
}

/**
 * Submit a previously saved draft application
 */
export async function submitDraftApplication(applicationId) {
  try {
    const res = await request(`/applications/${applicationId}/submit`, {
      method: 'POST',
    });
    return res;
  } catch (err) {
    console.warn('submitDraftApplication error:', err.message);
    throw err;
  }
}

/**
 * Withdraw an application (only allowed before APPROVED/DISBURSED)
 */
export async function withdrawApplication(applicationId, remarks = '') {
  try {
    const res = await request(`/applications/${applicationId}/withdraw`, {
      method: 'POST',
      body: JSON.stringify({ remarks }),
    });
    return res;
  } catch (err) {
    console.warn('withdrawApplication error:', err.message);
    throw err;
  }
}

/**
 * Get real-time tracking info for a specific application
 */
export async function getApplicationTracking(applicationId) {
  try {
    const res = await request(`/applications/${applicationId}/track`);
    return res.data?.tracking || res.tracking || null;
  } catch (err) {
    console.warn('getApplicationTracking error:', err.message);
    return null;
  }
}

/**
 * Get documents attached to a specific application
 */
export async function getApplicationDocuments(applicationId) {
  try {
    const res = await request(`/applications/${applicationId}/documents`);
    return res.data?.documents || res.documents || [];
  } catch (err) {
    console.warn('getApplicationDocuments error:', err.message);
    return [];
  }
}

/**
 * Upload a document to an application
 */
export async function uploadApplicationDocument(applicationId, file, documentType = '') {
  try {
    const fd = new FormData();
    fd.append('document', file);
    fd.append('document_type', documentType || file.name.split('.')[0] || 'Document');
    const res = await request(`/applications/${applicationId}/documents`, {
      method: 'POST',
      body: fd,
    });
    return res.data?.document || res.document || null;
  } catch (err) {
    console.warn('uploadApplicationDocument error:', err.message);
    throw err;
  }
}

/**
 * Replace an existing document
 */
export async function replaceApplicationDocument(applicationId, documentId, file, documentType = '') {
  try {
    const fd = new FormData();
    fd.append('document', file);
    fd.append('document_type', documentType || file.name.split('.')[0] || 'Document');
    const res = await request(`/applications/${applicationId}/documents/${documentId}`, {
      method: 'PUT',
      body: fd,
    });
    return res.data?.document || res.document || null;
  } catch (err) {
    console.warn('replaceApplicationDocument error:', err.message);
    throw err;
  }
}

/**
 * Save dynamic form answers for a draft application
 */
export async function saveFormAnswers(applicationId, answers = []) {
  try {
    const res = await request(`/applications/${applicationId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
    return res.data?.answers || res.answers || [];
  } catch (err) {
    console.warn('saveFormAnswers error:', err.message);
    throw err;
  }
}

/**
 * Retrieve form answers saved for a draft application
 */
export async function getFormAnswers(applicationId) {
  try {
    const res = await request(`/applications/${applicationId}/answers`);
    return res.data?.answers || res.answers || [];
  } catch (err) {
    console.warn('getFormAnswers error:', err.message);
    return [];
  }
}

// ----------------------------------------------------
// Admin & Review APIs
// ----------------------------------------------------
export async function getAdminMetrics() {
  try {
    const res = await request('/applications/admin/stats');
    const s = res?.stats || res?.data?.stats || {};
    return {
      total_applications: parseInt(s.total_applications || 0, 10),
      pending_review: parseInt(s.pending_applications || 0, 10),
      approved_grants: parseInt(s.approved_applications || 0, 10),
      rejected_count: parseInt(s.rejected_applications || 0, 10),
      total_disbursed: parseFloat(s.total_disbursed || 0),
      total_budget: 7500000,
      avg_cgpa: '8.45',
      total_students: parseInt(s.total_students || 0, 10),
      total_scholarships: parseInt(s.total_scholarships || 0, 10),
    };
  } catch (err) {
    console.warn('getAdminMetrics error:', err.message);
    throw err;
  }
}

export async function getAdminApplications(statusFilter = 'ALL') {
  try {
    const query = statusFilter !== 'ALL' ? `?status=${statusFilter}&limit=50` : '?limit=50';
    const res = await request(`/applications/admin/all${query}`);
    const rawApps = res.data?.applications || res.applications || [];

    return rawApps.map((a) => ({
      id: String(a.application_id || a.id),
      raw_id: a.application_id || a.id,
      application_number: a.application_number || `APP-2026-00${a.application_id || a.id}`,
      applicant_name: a.student_name || (a.student_id ? `Student #${a.student_id}` : 'Applicant'),
      email: a.student_email || '',
      student_uid: a.student_id ? `STU-2025-0${a.student_id}` : 'STU-2025-01',
      student_id: a.student_id,
      scholarship_id: a.scholarship_id,
      cgpa: a.cgpa || 8.5,
      income: a.annual_income || 350000,
      scholarship_title: a.scholarship_name || a.scholarship_title || 'Scholarship Scheme',
      category: a.category || 'Merit',
      amount: parseFloat(a.scholarship_amount || a.amount) || 50000,
      status: a.status || 'SUBMITTED',
      submitted_date: a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : 'Recent',
      documents_count: parseInt(a.document_count || a.doc_count || 3, 10),
      remarks: a.reviewer_name ? `Reviewed by ${a.reviewer_name}` : (a.remarks || 'Awaiting reviewer remarks'),
    }));
  } catch (err) {
    console.warn('getAdminApplications error:', err.message);
    throw err;
  }
}

export async function updateApplicationStatus(appId, newStatus, remarks = '') {
  try {
    return await request(`/applications/${appId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: newStatus,
        remarks: remarks || `Status changed to ${newStatus}`,
        comment: remarks || `Status changed to ${newStatus}`,
      }),
    });
  } catch (err) {
    console.warn('updateApplicationStatus error:', err.message);
    throw err;
  }
}

// ----------------------------------------------------
// Review Service APIs (Port 3004)
// ----------------------------------------------------

export async function getReviewByApplicationId(applicationId) {
  try {
    const token = getStoredToken();
    const res = await fetch(`/api/reviews/application/${encodeURIComponent(applicationId)}`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.warn('getReviewByApplicationId error:', err.message);
    return null;
  }
}

export async function createReviewRecord(data) {
  try {
    const token = getStoredToken();
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.warn('createReviewRecord error:', err.message);
    return null;
  }
}

export async function verifyReviewDocuments(reviewId, documents) {
  const token = getStoredToken();
  const res = await fetch(`/api/reviews/${reviewId}/documents`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ documents }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to verify documents');
  return json.data;
}

export async function updateReviewEligibility(reviewId, eligible, remarks = '') {
  const token = getStoredToken();
  const res = await fetch(`/api/reviews/${reviewId}/eligibility`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ eligible, remarks }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to update eligibility');
  return json.data;
}

export async function submitReviewDecision(reviewId, decision, remarks = '', reviewedBy = '') {
  const token = getStoredToken();
  const res = await fetch(`/api/reviews/${reviewId}/decision`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ decision, remarks, reviewedBy }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Failed to submit decision');
  return json.data;
}


export async function createScholarship(scholarshipData) {
  const payload = {
    // Support both old and new field naming conventions
    title: scholarshipData.title || scholarshipData.name,
    name: scholarshipData.title || scholarshipData.name,
    description: scholarshipData.description || '',
    category: scholarshipData.category,
    category_name: scholarshipData.category,
    // Support both amount and award_amount
    amount: Number(scholarshipData.amount || scholarshipData.award_amount || 0),
    award_amount: Number(scholarshipData.amount || scholarshipData.award_amount || 0),
    min_cgpa: scholarshipData.min_gpa || scholarshipData.min_cgpa
      ? Number(scholarshipData.min_gpa || scholarshipData.min_cgpa)
      : null,
    max_income: scholarshipData.max_income
      ? Number(scholarshipData.max_income)
      : null,
    department: scholarshipData.department || null,
    total_slots: scholarshipData.total_slots
      ? Number(scholarshipData.total_slots)
      : null,
    deadline: scholarshipData.deadline
      ? scholarshipData.deadline.split('T')[0]
      : null,
    application_end_date: scholarshipData.deadline
      ? scholarshipData.deadline.split('T')[0]
      : null,
    status: 'published',
    required_documents: scholarshipData.required_documents || [],
    eligibility_criteria: scholarshipData.eligibility_criteria || [],
    provider_name: scholarshipData.provider_name || 'ApexScholar Foundation',
    academic_year: scholarshipData.academic_year || '2026-2027',
  };

  const res = await request('/scholarships', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return res;
}

export async function checkSystemHealth() {
  try {
    const res = await fetch('/health');
    if (!res.ok) {
      return { status: 'degraded', httpStatus: res.status };
    }
    const data = await res.json();
    return {
      status: data.status || (data.success ? 'healthy' : 'degraded'),
      service: data.service,
      timestamp: data.timestamp,
      services: data.services || {},
    };
  } catch (err) {
    console.warn('checkSystemHealth error:', err.message);
    return {
      status: 'unreachable',
      error: err.message,
    };
  }
}

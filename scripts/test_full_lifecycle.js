// Fresh E2E lifecycle test - creates a new application and runs the full lifecycle
const http = require('http');

const SVC_TOKEN = 'internal_super_secret_token_change_in_prod';
const BASE_APP = 3003;
const BASE_REV = 3004;
const BASE_ID = 3001;

function httpReq(port, path, method, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    const opts = { hostname: 'localhost', port, path, method, headers };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

async function main() {
  const SH = { 'X-Service-Token': SVC_TOKEN };

  // 1. Create a fresh student account to avoid duplicate application
  console.log('--- Step 1: Creating fresh student account ---');
  const ts = Date.now();
  const r1 = await httpReq(BASE_ID, '/api/v1/auth/register', 'POST', {
    username: `teststudent${ts}`,
    email: `test.student.${ts}@example.com`,
    password: 'TestPass123!',
    role: 'student',
  }, {});
  console.log('Register:', r1.status, r1.body?.message || JSON.stringify(r1.body).slice(0, 200));
  
  let studentToken = r1.body?.token;
  if (!studentToken && (r1.status === 201 || r1.status === 200)) {
    // Try logging in
    const r1b = await httpReq(BASE_ID, '/api/v1/auth/login', 'POST', {
      email: `test.student.${ts}@example.com`,
      password: 'TestPass123!',
    }, {});
    studentToken = r1b.body?.token || r1b.body?.data?.token;
    console.log('Login:', r1b.status, 'Token:', studentToken ? 'obtained' : 'missing');
  }
  
  if (!studentToken) {
    console.log('Could not get student token. Aborting.');
    return;
  }

  // 2. Get a scholarship to apply for
  console.log('\n--- Step 2: Finding a scholarship ---');
  const r2 = await httpReq(3002, '/api/v1/scholarships', 'GET', null, SH);
  const scholarships = r2.body?.items || r2.body?.data?.scholarships || r2.body?.data || [];
  console.log('Scholarships found:', scholarships.length);
  if (!scholarships.length) {
    console.log('No scholarships available. Cannot continue.');
    return;
  }
  const scholarship = scholarships[0];
  console.log('Using scholarship:', scholarship.id || scholarship.scholarship_id, scholarship.title || scholarship.name);

  // 3. Submit application as student
  console.log('\n--- Step 3: Submitting application ---');
  const r3 = await httpReq(BASE_APP, '/api/v1/applications', 'POST', {
    scholarship_id: String(scholarship.id || scholarship.scholarship_id),
    statement: 'I am applying for this scholarship as part of the lifecycle test.',
    sop: 'Statement of purpose for lifecycle test application.',
    cgpa: 8.5,
    family_income: 150000,
    annual_income: 150000,
    academic_details: { cgpa: 8.5, percentage: 85 },
  }, { 'Authorization': `Bearer ${studentToken}` });
  console.log('Submit app:', r3.status, JSON.stringify(r3.body).slice(0, 400));
  
  const appId = r3.body?.data?.application_id || r3.body?.data?.application?.id || r3.body?.data?.id;
  if (!appId) {
    console.log('No application ID returned. Cannot continue.');
    return;
  }
  console.log('Application ID:', appId);

  // 4. Create review (service token - admin role)
  console.log('\n--- Step 4: Creating review ---');
  const appDetails = r3.body?.data?.application || r3.body?.data;
  
  // Check if review already exists for this application
  const r4check = await httpReq(BASE_REV, `/api/reviews/application/${appId}`, 'GET', null, SH);
  let reviewId;
  
  if (r4check.status === 200 && r4check.body?.data?.id) {
    reviewId = r4check.body.data.id;
    console.log('Found existing review:', reviewId);
  } else {
    const r4 = await httpReq(BASE_REV, '/api/reviews', 'POST', {
      applicationId: appId,
      studentId: appDetails?.student_id || 'unknown',
      scholarshipId: String(scholarship.id || scholarship.scholarship_id),
      documents: [
        { name: 'Identity Proof', status: 'PENDING' },
        { name: 'Academic Marksheet', status: 'PENDING' },
      ],
    }, SH);
    console.log('Create review:', r4.status, JSON.stringify(r4.body).slice(0, 400));
    reviewId = r4.body?.data?.id;
  }
  if (!reviewId) {
    console.log('No review ID. Cannot continue.');
    return;
  }
  console.log('Review ID:', reviewId);

  // 5. Verify documents (triggers UNDER_REVIEW sync to Application Service)
  console.log('\n--- Step 5: Verify documents (UNDER_REVIEW sync) ---');
  // First get current review to know all doc names
  const r5get = await httpReq(BASE_REV, `/api/reviews/${reviewId}`, 'GET', null, SH);
  const currentDocs = r5get.body?.data?.documents || [];
  console.log('Current docs in review:', currentDocs.map(d => `${d.name}:${d.status}`).join(', ') || 'none');

  // Build VERIFIED payload for all existing docs
  const verifyPayload = currentDocs.length > 0
    ? currentDocs.map(d => ({ name: d.name, status: 'VERIFIED', remarks: 'Verified OK' }))
    : [
        { name: 'Identity Proof', status: 'VERIFIED', remarks: 'Valid govt ID' },
        { name: 'Academic Marksheet', status: 'VERIFIED', remarks: 'Marks verified' },
      ];

  const r5 = await httpReq(BASE_REV, `/api/reviews/${reviewId}/documents`, 'PATCH', {
    documents: verifyPayload,
  }, SH);
  console.log('verifyDocuments:', r5.status, JSON.stringify(r5.body).slice(0, 300));

  // Check application status after verify
  await new Promise(res => setTimeout(res, 800));
  const r5b = await httpReq(BASE_APP, `/api/v1/applications/${appId}`, 'GET', null, SH);
  const appAfterVerify = r5b.body?.data?.application?.status || r5b.body?.data?.status;
  console.log('App status after verifyDocuments:', appAfterVerify, '(expected: UNDER_REVIEW)');

  // Check daemon logs for warn message
  if (appAfterVerify !== 'UNDER_REVIEW') {
    console.error('⚠️  UNDER_REVIEW sync failed - check daemon logs for console.warn');
  }

  // 6. Update eligibility
  console.log('\n--- Step 6: Update eligibility ---');
  const r6 = await httpReq(BASE_REV, `/api/reviews/${reviewId}/eligibility`, 'PATCH', {
    eligible: true,
    remarks: 'Student meets all criteria',
  }, SH);
  console.log('Eligibility:', r6.status, JSON.stringify(r6.body).slice(0, 200));

  // 7. Decide APPROVED
  console.log('\n--- Step 7: Decide APPROVED ---');
  const r7 = await httpReq(BASE_REV, `/api/reviews/${reviewId}/decision`, 'PATCH', {
    decision: 'APPROVED',
    remarks: 'Scholarship granted to eligible student',
    reviewedBy: 'admin-system',
  }, SH);
  console.log('Decide:', r7.status, JSON.stringify(r7.body).slice(0, 500));
  const callbackStatus = r7.body?.data?.callbackStatus;
  console.log('Callback status:', callbackStatus, '(expected: SYNCED)');

  // 8. Final application status
  await new Promise(res => setTimeout(res, 800));
  const r8 = await httpReq(BASE_APP, `/api/v1/applications/${appId}`, 'GET', null, SH);
  const finalStatus = r8.body?.data?.application?.status || r8.body?.data?.status;
  console.log('\nFinal app status:', finalStatus, '(expected: APPROVED)');
  
  if (finalStatus === 'APPROVED') {
    console.log('\n✅ FULL LIFECYCLE COMPLETE: SUBMITTED → UNDER_REVIEW → APPROVED');
  } else {
    console.log('\n❌ LIFECYCLE BROKEN — final status:', finalStatus);
    console.log('Full response:', JSON.stringify(r8.body).slice(0, 600));
  }
}

main().catch((e) => console.error('FATAL:', e.message, '\n', e.stack));

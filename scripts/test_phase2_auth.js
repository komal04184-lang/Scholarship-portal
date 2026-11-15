// Phase 2 Authorization & Edge Case Tests
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

const SH = { 'X-Service-Token': SVC_TOKEN };
let passed = 0;
let failed = 0;

function check(label, condition, details = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label} ${details}`);
    failed++;
  }
}

async function main() {
  // ---- Setup: Create student and get token ----
  const ts = Date.now();
  const r0 = await httpReq(BASE_ID, '/api/v1/auth/register', 'POST', {
    username: `authtest${ts}`,
    email: `authtest.${ts}@example.com`,
    password: 'TestPass123!',
    role: 'student',
  }, {});
  const studentToken = r0.body?.token;
  console.log('Student token obtained:', studentToken ? 'yes' : 'no (status ' + r0.status + ')');
  if (!studentToken) { console.log(JSON.stringify(r0.body).slice(0, 300)); return; }

  // Get an application for this student
  const r0apps = await httpReq(BASE_APP, '/api/v1/applications/admin/all', 'GET', null, SH);
  const apps = r0apps.body?.data?.applications || [];
  const anyApp = apps.find(a => a.status === 'APPROVED') || apps[0];
  const anyAppId = anyApp?.application_id;
  console.log('Using existing app for auth tests:', anyAppId, '| status:', anyApp?.status);

  // ---- TEST 1: Student cannot PATCH application status ----
  console.log('\n[Test 1] Student cannot update application status (expect 403)');
  if (anyAppId) {
    const t1 = await httpReq(BASE_APP, `/api/v1/applications/${anyAppId}/status`, 'PATCH',
      { status: 'APPROVED', comment: 'Student trying to self-approve' },
      { 'Authorization': `Bearer ${studentToken}` }
    );
    check('Student PATCH /status → 403', t1.status === 403, `got ${t1.status}`);
  } else {
    console.log('  ⚠️  Skipped (no app ID)');
  }

  // ---- TEST 2: Unauthenticated cannot create review ----
  console.log('\n[Test 2] Unauthenticated cannot create review (expect 401)');
  const t2 = await httpReq(BASE_REV, '/api/reviews', 'POST', {
    applicationId: 'fake-app-id',
    studentId: 'fake-student-id',
    scholarshipId: '1',
    documents: [{ name: 'ID', status: 'PENDING' }],
  }, {});
  check('No auth → 401', t2.status === 401, `got ${t2.status}`);

  // ---- TEST 3: Student cannot access reviewer-only endpoints ----
  console.log('\n[Test 3] Student cannot list reviews (expect 403 or 401)');
  const t3 = await httpReq(BASE_REV, '/api/reviews', 'GET', null,
    { 'Authorization': `Bearer ${studentToken}` }
  );
  check('Student GET /reviews → 401 or 403', t3.status === 401 || t3.status === 403, `got ${t3.status}`);

  // ---- TEST 4: Duplicate review prevention ----
  console.log('\n[Test 4] Duplicate review prevention (expect 409)');
  // First find an application with no existing review
  const noReviewApp = apps.find(a => a.status === 'SUBMITTED');
  if (noReviewApp) {
    // Create review 1
    const t4a = await httpReq(BASE_REV, '/api/reviews', 'POST', {
      applicationId: noReviewApp.application_id,
      studentId: noReviewApp.student_id,
      scholarshipId: noReviewApp.scholarship_id,
      documents: [{ name: 'ID Proof', status: 'PENDING' }],
    }, SH);
    
    if (t4a.status === 201) {
      // Create duplicate review
      const t4b = await httpReq(BASE_REV, '/api/reviews', 'POST', {
        applicationId: noReviewApp.application_id,
        studentId: noReviewApp.student_id,
        scholarshipId: noReviewApp.scholarship_id,
        documents: [{ name: 'ID Proof', status: 'PENDING' }],
      }, SH);
      check('Duplicate review → 409', t4b.status === 409, `got ${t4b.status}: ${JSON.stringify(t4b.body).slice(0, 100)}`);
    } else if (t4a.status === 409) {
      // Review already exists
      check('Duplicate review already prevented (existing review found → 409)', true);
    } else {
      console.log('  ⚠️  First review creation failed:', t4a.status, JSON.stringify(t4a.body).slice(0, 200));
    }
  } else {
    console.log('  ⚠️  No SUBMITTED app without review found, skipping');
  }

  // ---- TEST 5: Tracking endpoint shows correct status ----
  console.log('\n[Test 5] Application tracking endpoint');
  if (anyAppId) {
    const t5 = await httpReq(BASE_APP, `/api/v1/applications/${anyAppId}/track`, 'GET', null, SH);
    check('Track endpoint responds 200', t5.status === 200, `got ${t5.status}`);
    if (t5.status === 200) {
      const tracking = t5.body?.data?.tracking || t5.body?.data;
      check('Track has current_status', !!tracking?.current_status, `got: ${JSON.stringify(tracking).slice(0, 100)}`);
      check('Track has progress_percentage', typeof tracking?.progress_percentage === 'number');
      check('Track has timeline array', Array.isArray(tracking?.timeline));
      console.log('  Track data:', {
        status: tracking?.current_status,
        progress: tracking?.progress_percentage,
        timeline_entries: tracking?.timeline?.length,
      });
    }
  } else {
    console.log('  ⚠️  Skipped (no app ID)');
  }

  // ---- TEST 6: Admin stats endpoint returns real data ----
  console.log('\n[Test 6] Admin stats endpoint');
  const t6 = await httpReq(BASE_APP, '/api/v1/applications/admin/stats', 'GET', null, SH);
  check('Admin stats responds 200', t6.status === 200, `got ${t6.status}`);
  if (t6.status === 200) {
    const stats = t6.body?.data?.stats || t6.body?.stats || t6.body?.data;
    check('Stats has total_applications', typeof stats?.total_applications === 'number' || typeof stats?.total_applications === 'string');
    console.log('  Stats:', {
      total: stats?.total_applications,
      approved: stats?.approved,
      pending: stats?.pending,
      students: stats?.total_students,
    });
  }

  // ---- TEST 7: Student cannot access admin stats ----
  console.log('\n[Test 7] Student cannot access admin stats (expect 403)');
  const t7 = await httpReq(BASE_APP, '/api/v1/applications/admin/stats', 'GET', null,
    { 'Authorization': `Bearer ${studentToken}` }
  );
  check('Student GET /admin/stats → 403', t7.status === 403, `got ${t7.status}`);

  // ---- TEST 8: Unauthenticated cannot access admin stats ----
  console.log('\n[Test 8] No auth cannot access admin stats (expect 401)');
  const t8 = await httpReq(BASE_APP, '/api/v1/applications/admin/stats', 'GET', null, {});
  check('No auth GET /admin/stats → 401', t8.status === 401, `got ${t8.status}`);

  // ---- SUMMARY ----
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Phase 2 Auth Tests: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('✅ All authorization tests passed');
  } else {
    console.log('❌ Some tests failed — review above');
  }
}

main().catch((e) => console.error('FATAL:', e.message));

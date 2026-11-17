const API_BASE = 'http://localhost:3000/api/v1';

async function req(url, options = {}) {
  const res = await fetch(url, options);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.arrayBuffer();
  }
  return {
    status: res.status,
    headers: res.headers,
    data,
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('  APEXSCHOLAR ADDITIONAL ISSUES VERIFICATION SUITE  ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Authenticate Admin
    console.log('--- Step 1: Authenticate Admin ---');
    const adminLoginRes = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@scholarship.gov.in',
        password: 'Admin@123',
      }),
    });
    console.log('Admin login status:', adminLoginRes.status, 'Response:', JSON.stringify(adminLoginRes.data));
    const adminToken = adminLoginRes.data?.token || adminLoginRes.data?.data?.tokens?.accessToken;
    assert(!!adminToken, 'Admin login succeeded and access token generated');

    const adminAuthHeader = {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    };

    // 2. Authenticate Reviewer
    console.log('\n--- Step 2: Authenticate Reviewer ---');
    const revLoginRes = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'reviewer@scholarship.gov.in',
        password: 'Reviewer@123',
      }),
    });
    const reviewerToken = revLoginRes.data?.token || revLoginRes.data?.data?.tokens?.accessToken;
    assert(!!reviewerToken, 'Reviewer login succeeded and access token generated');

    // 3. Authenticate Student
    console.log('\n--- Step 3: Authenticate Student ---');
    const studentLoginRes = await req(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@scholarship.gov.in',
        password: 'Student@123',
      }),
    });
    const studentToken = studentLoginRes.data?.token || studentLoginRes.data?.data?.tokens?.accessToken;
    assert(!!studentToken, 'Student login succeeded and access token generated');
    const studentAuthHeader = {
      Authorization: `Bearer ${studentToken}`,
      'Content-Type': 'application/json',
    };

    // 4. Test Scholarship Pause & Application Blocking (Issue 3 & 6)
    console.log('\n--- Step 4: Test Scholarship Pause & Application Blocking ---');
    // Create an active scholarship with a future deadline for clean pause/resume testing
    const futurePayload = {
      title: 'Active Lifecycle Scholarship ' + Date.now(),
      description: 'Active scholarship with future deadline for verifying pause and resume controls',
      category: 'Merit',
      department: 'Engineering & Technology',
      amount: 60000,
      total_slots: 10,
      min_gpa: 7.5,
      deadline: '2027-12-31',
      eligibility_criteria: ['Enrolled full-time student', 'Min CGPA 7.5'],
      required_documents: ['Academic Marksheet', 'Income Certificate'],
      status: 'published',
    };

    const futureSchRes = await req(`${API_BASE}/scholarships`, {
      method: 'POST',
      headers: adminAuthHeader,
      body: JSON.stringify(futurePayload),
    });
    const testSch = futureSchRes.data?.data || futureSchRes.data?.scholarship || futureSchRes.data;
    const sId = testSch.scholarship_id || testSch.id;
    console.log(`Created test scholarship: ${testSch.title} (${sId})`);

    // Admin pauses scholarship
    const pauseRes = await req(`${API_BASE}/scholarships/${sId}/status`, {
      method: 'PATCH',
      headers: adminAuthHeader,
      body: JSON.stringify({ status: 'paused', remarks: 'Temporarily paused for system verification' }),
    });
    console.log('pauseRes status:', pauseRes.status, 'body:', JSON.stringify(pauseRes.data));
    assert(
      pauseRes.status === 200 && (pauseRes.data.status === 'paused' || pauseRes.data.data?.status === 'paused'),
      `Scholarship status successfully transitioned to PAUSED (status: ${pauseRes.data.status || pauseRes.data.data?.status})`
    );

    // Student attempts to submit application to PAUSED scholarship -> MUST BE REJECTED WITH SCHOLARSHIP_PAUSED
    const applyToPausedRes = await req(`${API_BASE}/applications`, {
      method: 'POST',
      headers: studentAuthHeader,
      body: JSON.stringify({
        scholarship_id: sId,
        sop: 'I am applying for this scholarship award with full academic commitment.',
      }),
    });
    console.log('applyToPausedRes status:', applyToPausedRes.status, 'body:', JSON.stringify(applyToPausedRes.data));
    const isPausedBlocked = applyToPausedRes.status === 400 &&
      (JSON.stringify(applyToPausedRes.data).includes('PAUSED') || JSON.stringify(applyToPausedRes.data).includes('paused'));
    assert(
      isPausedBlocked,
      `Application to PAUSED scholarship rejected with HTTP 400 (Status: ${applyToPausedRes.status}, Code: SCHOLARSHIP_PAUSED)`
    );

    // Admin resumes future scholarship -> MUST SUCCEED
    const resumeRes = await req(`${API_BASE}/scholarships/${sId}/status`, {
      method: 'PATCH',
      headers: adminAuthHeader,
      body: JSON.stringify({ status: 'published', remarks: 'Resuming verified scholarship' }),
    });
    console.log('resumeRes status:', resumeRes.status, 'body:', JSON.stringify(resumeRes.data));
    const isResumed = resumeRes.status === 200 &&
      (resumeRes.data.data?.status === 'published' || resumeRes.data.data?.status === 'open' || resumeRes.data.data?.raw_status === 'published');
    assert(
      isResumed,
      `Scholarship successfully resumed to PUBLISHED (status: ${resumeRes.data.data?.raw_status || resumeRes.data.data?.status})`
    );

    // 5. Test Deadline Enforcement on Past Deadline (Issue 6)
    console.log('\n--- Step 5: Test Deadline Enforcement ---');
    const expiredPayload = {
      title: 'Past Deadline Test Award ' + Date.now(),
      description: 'Award created to verify strict deadline closing and submission blockage',
      category: 'Merit',
      department: 'Engineering & Technology',
      amount: 45000,
      total_slots: 5,
      min_gpa: 7.0,
      application_start_date: '2022-01-01',
      deadline: '2023-01-01', // Definitely expired
      eligibility_criteria: ['Enrolled in B.Tech program'],
      required_documents: ['Academic Marksheet'],
      status: 'published',
    };

    const createExpiredRes = await req(`${API_BASE}/scholarships`, {
      method: 'POST',
      headers: adminAuthHeader,
      body: JSON.stringify(expiredPayload),
    });
    console.log('createExpiredRes status:', createExpiredRes.status, 'body:', JSON.stringify(createExpiredRes.data));
    const expiredSch = createExpiredRes.data?.data || createExpiredRes.data?.scholarship || createExpiredRes.data;
    const expiredSchId = expiredSch.scholarship_id || expiredSch.id;
    assert(!!expiredSchId, `Created test scholarship with past deadline (2023-01-01, id: ${expiredSchId})`);

    // Verify trying to resume an expired paused scholarship fails
    // First pause it
    await req(`${API_BASE}/scholarships/${expiredSchId}/status`, {
      method: 'PATCH',
      headers: adminAuthHeader,
      body: JSON.stringify({ status: 'paused', remarks: 'Paused expired scholarship' }),
    });
    // Now try to resume it -> MUST FAIL
    const tryResumeExpiredRes = await req(`${API_BASE}/scholarships/${expiredSchId}/status`, {
      method: 'PATCH',
      headers: adminAuthHeader,
      body: JSON.stringify({ status: 'published', remarks: 'Trying to resume expired scholarship' }),
    });
    assert(
      tryResumeExpiredRes.status === 400 && JSON.stringify(tryResumeExpiredRes.data).includes('expired'),
      `Resuming expired scholarship rejected with HTTP 400 (${tryResumeExpiredRes.data?.message})`
    );

    // Create an unpaused expired scholarship for testing direct submission rejection
    const expiredUnpausedPayload = {
      ...expiredPayload,
      title: 'Past Deadline Direct Apply Test ' + Date.now(),
    };
    const createUnpausedExpiredRes = await req(`${API_BASE}/scholarships`, {
      method: 'POST',
      headers: adminAuthHeader,
      body: JSON.stringify(expiredUnpausedPayload),
    });
    const unpausedExpiredId = createUnpausedExpiredRes.data?.data?.scholarship_id || createUnpausedExpiredRes.data?.scholarship_id;

    // Direct submit application to expired scholarship -> MUST BE REJECTED WITH APPLICATION_DEADLINE_PASSED
    const expiredApplyRes = await req(`${API_BASE}/applications`, {
      method: 'POST',
      headers: studentAuthHeader,
      body: JSON.stringify({
        scholarship_id: unpausedExpiredId,
        sop: 'Trying to apply after deadline has passed.',
      }),
    });
    console.log('expiredApplyRes status:', expiredApplyRes.status, 'body:', JSON.stringify(expiredApplyRes.data));
    const isExpiredApplyBlocked = expiredApplyRes.status === 400 &&
      (JSON.stringify(expiredApplyRes.data).includes('DEADLINE') || JSON.stringify(expiredApplyRes.data).includes('deadline'));
    assert(
      isExpiredApplyBlocked,
      `Application to EXPIRED scholarship rejected with HTTP 400 (Status: ${expiredApplyRes.status}, Error: ${JSON.stringify(expiredApplyRes.data?.error || expiredApplyRes.data?.message)})`
    );

    // Creating a draft for an expired scholarship -> MUST BE REJECTED WITH APPLICATION_DEADLINE_PASSED
    const draftRes = await req(`${API_BASE}/applications/draft`, {
      method: 'POST',
      headers: studentAuthHeader,
      body: JSON.stringify({
        scholarship_id: unpausedExpiredId,
        sop: 'Draft created before final submission.',
      }),
    });
    console.log('draftRes status:', draftRes.status, 'body:', JSON.stringify(draftRes.data));
    const isDraftCreateBlocked = draftRes.status === 400 &&
      (JSON.stringify(draftRes.data).includes('DEADLINE') || JSON.stringify(draftRes.data).includes('deadline'));
    assert(
      isDraftCreateBlocked,
      `Draft creation for EXPIRED scholarship rejected with HTTP 400 (APPLICATION_DEADLINE_PASSED)`
    );

    // Now test draft submission deadline enforcement:
    // 1. Create a draft on the active future scholarship (sId)
    const validDraftRes = await req(`${API_BASE}/applications/draft`, {
      method: 'POST',
      headers: studentAuthHeader,
      body: JSON.stringify({
        scholarship_id: sId,
        sop: 'Draft created when scholarship was active.',
      }),
    });
    const validDraftApp = validDraftRes.data?.data?.application || validDraftRes.data?.application;
    const validDraftId = validDraftApp?.application_id || validDraftApp?.id;
    assert(!!validDraftId, `Draft application created for active scholarship (id: ${validDraftId})`);

    // 2. Temporarily pause or expire that scholarship to verify submitDraft rejects it
    await req(`${API_BASE}/scholarships/${sId}/status`, {
      method: 'PATCH',
      headers: adminAuthHeader,
      body: JSON.stringify({ status: 'paused', remarks: 'Paused before draft submit' }),
    });

    const submitPausedDraftRes = await req(`${API_BASE}/applications/${validDraftId}/submit`, {
      method: 'POST',
      headers: studentAuthHeader,
      body: JSON.stringify({}),
    });
    assert(
      submitPausedDraftRes.status === 400 && JSON.stringify(submitPausedDraftRes.data).includes('PAUSED'),
      `Draft submission to PAUSED scholarship rejected with HTTP 400 (SCHOLARSHIP_PAUSED)`
    );

    // 6. Test Safe Archive on Scholarship with Applications (Issue 3)
    console.log('\n--- Step 6: Test Safe Archive on Scholarship with Applications ---');
    // Notice `sId` HAS an application (`validDraftId` linked to it)
    const archiveRes = await req(`${API_BASE}/scholarships/${sId}`, {
      method: 'DELETE',
      headers: adminAuthHeader,
    });
    console.log('archiveRes status:', archiveRes.status, 'body:', JSON.stringify(archiveRes.data));
    assert(
      archiveRes.status === 200 && archiveRes.data.success && (archiveRes.data.data?.status === 'archived' || archiveRes.data.message?.includes('archived')),
      'Scholarship with applications was safely auto-archived instead of throwing DB foreign key violation'
    );

    // Verify archived scholarship is not returned in default student catalogue list
    const publicSchList = await req(`${API_BASE}/scholarships?limit=50`);
    const publicList = publicSchList.data?.scholarships || publicSchList.data?.items || publicSchList.data?.data || (Array.isArray(publicSchList.data) ? publicSchList.data : []);
    const isArchivedFoundInPublic = publicList.some((s) => (s.scholarship_id || s.id) === sId);
    assert(!isArchivedFoundInPublic, 'Archived scholarship is excluded from student public catalog list');

    // 7. Test Reviewer Document Preview Access (Issue 2)
    console.log('\n--- Step 7: Test Reviewer Document Access ---');
    const knownAppId = '192962d2-67c2-4349-b849-868bfd714d29';
    const appDocsRes = await req(`${API_BASE}/applications/${knownAppId}/documents`, {
      headers: { Authorization: `Bearer ${reviewerToken}` },
    });
    const docs = appDocsRes.data?.data?.documents || appDocsRes.data?.documents || appDocsRes.data?.data || [];
    assert(docs.length >= 2, `Reviewer successfully loaded ${docs.length} documents for application ${knownAppId}`);

    if (docs.length > 0) {
      const doc = docs[0];
      const docId = doc.id || doc.application_document_id;
      // Fetch preview
      const previewRes = await req(`${API_BASE}/applications/${knownAppId}/documents/${docId}/download?preview=true`, {
        headers: { Authorization: `Bearer ${reviewerToken}` },
      });
      assert(
        previewRes.status === 200 && previewRes.data.byteLength > 0,
        `Reviewer successfully fetched inline document preview (Bytes: ${previewRes.data.byteLength}, Content-Type: ${previewRes.headers.get('content-type')})`
      );
    }

    console.log('\n====================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('====================================================');

    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error('Test execution error:', error);
    process.exit(1);
  }
}

runTests();

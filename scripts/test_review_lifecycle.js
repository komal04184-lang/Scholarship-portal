// End-to-end review lifecycle test - runs via daemon task
// Tests: verifyDocuments → UNDER_REVIEW sync → decide → APPROVED sync
const http = require('http');

const SVC_TOKEN = 'internal_super_secret_token_change_in_prod';
const BASE_APP = 3003;
const BASE_REV = 3004;

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

  // 1. Find or create a SUBMITTED application for review
  const r1 = await httpReq(BASE_APP, '/api/v1/applications/admin/all', 'GET', null, SH);
  const apps = r1.body?.data?.applications || r1.body?.data || [];
  console.log('Total apps:', apps.length, '| HTTP', r1.status);

  let testApp = apps.find((a) => a.status === 'SUBMITTED');
  if (!testApp) {
    console.log('No SUBMITTED application. Available statuses:', [...new Set(apps.map((a) => a.status))]);
    console.log('Looking for UNDER_REVIEW apps too...');
    testApp = apps.find((a) => a.status === 'UNDER_REVIEW');
  }
  if (!testApp) {
    console.log('No suitable test application found. Exiting.');
    return;
  }
  console.log(`\nTest app: ${testApp.application_id}  status: ${testApp.status}`);

  // 2. Find or create a review for this application
  let reviewId;
  const r2 = await httpReq(BASE_REV, `/api/reviews?applicationId=${testApp.application_id}`, 'GET', null, SH);
  console.log('GET reviews:', r2.status, JSON.stringify(r2.body).slice(0, 200));
  
  const existingReview = r2.body?.data?.find?.((rv) => rv.applicationId === testApp.application_id)
    || (Array.isArray(r2.body) ? r2.body.find((rv) => rv.applicationId === testApp.application_id) : null);
  
  if (existingReview) {
    reviewId = existingReview.id;
    console.log('Using existing review:', reviewId, 'decision:', existingReview.decision);
    if (existingReview.decision) {
      console.log('Review already has decision. Try another app.');
      return;
    }
  } else {
    // Create a review
    const r3 = await httpReq(BASE_REV, '/api/reviews', 'POST', {
      applicationId: testApp.application_id,
      studentId: testApp.student_id,
      scholarshipId: testApp.scholarship_id,
      documents: [{ name: 'Identity Proof', status: 'PENDING' }],
    }, SH);
    console.log('Create review:', r3.status, JSON.stringify(r3.body).slice(0, 300));
    reviewId = r3.body?.data?.id || r3.body?.id;
  }

  if (!reviewId) {
    console.log('Could not get review ID. Aborting.');
    return;
  }
  console.log('\nReview ID:', reviewId);

  // 3. Verify documents (should trigger UNDER_REVIEW sync)
  if (testApp.status === 'SUBMITTED') {
    console.log('\n--- Step 3: verifyDocuments (should sync UNDER_REVIEW) ---');
    const r4 = await httpReq(BASE_REV, `/api/reviews/${reviewId}/documents`, 'PATCH', {
      documents: [{ name: 'Identity Proof', status: 'VERIFIED', remarks: 'Verified OK' }],
    }, SH);
    console.log('verifyDocuments:', r4.status, JSON.stringify(r4.body).slice(0, 300));

    // Check application status after verify
    await new Promise(res => setTimeout(res, 500));
    const r5 = await httpReq(BASE_APP, `/api/v1/applications/${testApp.application_id}`, 'GET', null, SH);
    const appStatus = r5.body?.data?.status || r5.body?.status;
    console.log('App status after verifyDocuments:', appStatus, '(expected: UNDER_REVIEW)');
    if (appStatus !== 'UNDER_REVIEW') {
      console.error('BLOCKER: App still not UNDER_REVIEW after verifyDocuments sync');
    }
  }

  // 4. Update eligibility
  console.log('\n--- Step 4: updateEligibility ---');
  const r6 = await httpReq(BASE_REV, `/api/reviews/${reviewId}/eligibility`, 'PATCH', {
    eligible: true,
    remarks: 'Eligibility verified',
  }, SH);
  console.log('eligibility:', r6.status, JSON.stringify(r6.body).slice(0, 200));

  // 5. Verify all docs again (after eligibility)
  console.log('\n--- Step 5: Verify all docs VERIFIED ---');
  const r7 = await httpReq(BASE_REV, `/api/reviews/${reviewId}/documents`, 'PATCH', {
    documents: [{ name: 'Identity Proof', status: 'VERIFIED', remarks: 'All good' }],
  }, SH);
  console.log('verify docs 2:', r7.status);

  // 6. Decide APPROVED
  console.log('\n--- Step 6: decide(APPROVED) ---');
  const r8 = await httpReq(BASE_REV, `/api/reviews/${reviewId}/decision`, 'PATCH', {
    decision: 'APPROVED',
    remarks: 'Scholarship granted',
    reviewedBy: 'reviewer-system',
  }, SH);
  console.log('decide:', r8.status, JSON.stringify(r8.body).slice(0, 400));

  // 7. Check final application status
  await new Promise(res => setTimeout(res, 500));
  const r9 = await httpReq(BASE_APP, `/api/v1/applications/${testApp.application_id}`, 'GET', null, SH);
  const finalStatus = r9.body?.data?.status || r9.body?.status;
  console.log('\nFinal app status:', finalStatus, '(expected: APPROVED)');
  console.log(finalStatus === 'APPROVED' ? '✅ LIFECYCLE COMPLETE' : '❌ LIFECYCLE BROKEN');
}

main().catch((e) => console.error('FATAL:', e.message, e.stack));

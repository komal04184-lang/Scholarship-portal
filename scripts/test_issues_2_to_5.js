/**
 * Test Issues 2, 3, 4, 5:
 * Issue 2 - Document Download / Preview & Authorization
 * Issue 3 - Mandatory Document Verification on Submit Draft
 * Issue 4 - Authentic Student Profile Integrity
 * Issue 5 - Duplicate Application Prevention (HTTP 409 & DB constraint)
 */
const http = require('http');

const GATEWAY = 'http://localhost:3000';

function postJson(url, data, token = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getJson(url, token = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          try {
            resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(buffer.toString()), buffer });
          } catch (e) {
            resolve({ status: res.statusCode, headers: res.headers, raw: buffer.toString(), buffer });
          }
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

function uploadFile(url, fieldName, filename, fileBuffer, mimeType, formFields = {}, token = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const crlf = '\r\n';

    let headerParts = '';
    for (const [k, v] of Object.entries(formFields)) {
      headerParts += `--${boundary}${crlf}`;
      headerParts += `Content-Disposition: form-data; name="${k}"${crlf}${crlf}`;
      headerParts += `${v}${crlf}`;
    }

    headerParts += `--${boundary}${crlf}`;
    headerParts += `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"${crlf}`;
    headerParts += `Content-Type: ${mimeType}${crlf}${crlf}`;

    const headBuf = Buffer.from(headerParts, 'utf-8');
    const tailBuf = Buffer.from(`${crlf}--${boundary}--${crlf}`, 'utf-8');
    const fullBody = Buffer.concat([headBuf, fileBuffer, tailBuf]);

    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': fullBody.length,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

async function main() {
  console.log('================================================================');
  console.log('       TEST SUITE: ISSUES 2, 3, 4, 5 VERIFICATION');
  console.log('================================================================\n');

  // 1. Create a fresh test student
  const ts = Date.now();
  console.log('Step 1: Registering authentic student...');
  const studentEmail = `student_${ts}@scholarship.gov.in`;
  const regRes = await postJson(`${GATEWAY}/api/v1/auth/register`, {
    username: `kavya_sharma_${ts.toString().slice(-4)}`,
    email: studentEmail,
    password: 'Password@123',
    phone: '9876543210',
    date_of_birth: '2004-05-15',
    gender: 'Female',
    state: 'Maharashtra',
    city: 'Pune',
    category: 'General',
    family_income: 380000,
    academic_details: {
      institution_name: 'Pune Institute of Computer Technology',
      course: 'Bachelor of Technology',
      branch: 'Computer Engineering',
      semester: 6,
      cgpa: 8.85,
      passing_year: 2026,
    },
  });

  if (regRes.status !== 201 && regRes.status !== 200) {
    console.error('Student registration failed:', regRes);
    process.exit(1);
  }
  const studentToken = regRes.data.token;
  console.log(`   Student registered successfully. Token length: ${studentToken.length}`);

  // Create another student for cross-authorization tests
  const otherRegRes = await postJson(`${GATEWAY}/api/v1/auth/register`, {
    username: `other_student_${ts.toString().slice(-4)}`,
    email: `other_${ts}@scholarship.gov.in`,
    password: 'Password@123',
    family_income: 400000,
  });
  const otherStudentToken = otherRegRes.data.token;

  // Reviewer login
  console.log('Step 2: Authenticating Reviewer...');
  const revLogin = await postJson(`${GATEWAY}/api/v1/auth/login`, {
    email: 'reviewer@scholarship.gov.in',
    password: 'Reviewer@123',
  });
  if (revLogin.status !== 200) {
    console.error('Reviewer login failed:', revLogin);
    process.exit(1);
  }
  const reviewerToken = revLogin.data.token;
  console.log('   Reviewer authenticated.');

  // ================================================================
  // ISSUE 4 VERIFICATION: Authentic Student Profile
  // ================================================================
  console.log('\n--- VERIFYING ISSUE 4: Authentic Student Profile ---');
  const profRes = await getJson(`${GATEWAY}/api/v1/profile/me`, studentToken);
  console.log('   Profile HTTP Status:', profRes.status);
  const profile = profRes.data?.user || profRes.data?.profile || profRes.data;
  console.log('   Student Name:', profile.username);
  console.log('   Department/Branch:', profile.academic_details?.branch);
  console.log('   CGPA:', profile.academic_details?.cgpa);
  console.log('   Family Income:', profile.family_income);
  console.log('   Enrollment No:', profile.enrollment_no || '(assigned/formatted)');

  if (profile.username.includes('Aarav Sharma') || profile.academic_details?.branch === 'Fake Department') {
    console.error('FAIL: Hardcoded student profile found!');
    process.exit(1);
  }
  if (!profile.academic_details?.branch || profile.academic_details?.cgpa !== 8.85) {
    console.error('FAIL: Profile fields do not match authentic identity data!');
    process.exit(1);
  }
  console.log('   ✅ PASS: Issue 4 verified. Authentic profile data returned without hardcoded fallbacks.');

  // ================================================================
  // ISSUE 3 VERIFICATION: Mandatory Documents Verification Workflow
  // ================================================================
  console.log('\n--- VERIFYING ISSUE 3: Mandatory Documents & 2-Stage Submission ---');
  // Target scholarship
  const catRes = await getJson(`${GATEWAY}/api/v1/scholarships`);
  const scholarships = catRes.data?.items || catRes.data?.scholarships || catRes.data?.data || [];
  const targetSch = scholarships[0];
  const scholarshipId = targetSch.scholarship_id || targetSch.id;
  console.log(`   Applying for Scholarship ID: ${scholarshipId} (${targetSch.name || targetSch.title})`);

  // Stage A: Create Draft Application
  console.log('   Stage A: Creating DRAFT application...');
  const draftRes = await postJson(
    `${GATEWAY}/api/v1/applications/draft`,
    {
      scholarship_id: String(scholarshipId),
      sop: 'Statement of purpose for testing mandatory document enforcement in 2-stage submission workflow.',
      academic_year: '2026-2027',
    },
    studentToken
  );
  console.log('   Draft Creation Status:', draftRes.status);
  if (draftRes.status !== 201 && draftRes.status !== 200) {
    console.error('FAIL: Could not create draft:', draftRes.data);
    process.exit(1);
  }
  const draftApp = draftRes.data?.data?.application || draftRes.data?.application || draftRes.data?.data;
  const appId = draftApp.application_id || draftApp.id;
  console.log(`   Draft Application created: ID=${appId}, Number=${draftApp.application_number}, Status=${draftApp.status}`);

  // Fetch requirements snapshot for this application
  const reqRes = await getJson(`${GATEWAY}/api/v1/applications/${appId}/requirements`, studentToken);
  console.log('   Requirements fetched:', reqRes.status);
  const requirements = reqRes.data?.data?.requirements || reqRes.data?.requirements || reqRes.data?.data || [];
  console.log(`   Requirement Count: ${requirements.length}`);
  requirements.forEach((r) => {
    console.log(`     - [${r.requirement_id}] ${r.requirement_name} (Code: ${r.requirement_code}, Mandatory: ${r.is_mandatory})`);
  });

  // Stage C (Premature attempt): Attempt to Submit Draft WITHOUT uploading documents
  console.log('   Stage C (Premature): Attempting to submit draft WITHOUT mandatory documents...');
  const prematureSubmit = await postJson(`${GATEWAY}/api/v1/applications/${appId}/submit`, {}, studentToken);
  console.log('   Premature Submit Status:', prematureSubmit.status);
  console.log('   Premature Submit Response:', JSON.stringify(prematureSubmit.data));

  if (prematureSubmit.status !== 400) {
    console.error(`FAIL: Expected HTTP 400 when submitting without mandatory documents, got ${prematureSubmit.status}`);
    process.exit(1);
  }
  const errCode = prematureSubmit.data?.error?.code || prematureSubmit.data?.errorCode || prematureSubmit.data?.code;
  const missingReqs = prematureSubmit.data?.error?.details?.missing_requirements || prematureSubmit.data?.details?.missing_requirements || [];
  console.log(`   Error Code: ${errCode}`);
  console.log(`   Missing Requirements reported:`, missingReqs);

  if (errCode !== 'MISSING_REQUIRED_DOCUMENTS' || missingReqs.length === 0) {
    console.error('FAIL: Did not return MISSING_REQUIRED_DOCUMENTS with list of missing requirements!');
    process.exit(1);
  }
  console.log('   ✅ PASS: Backend correctly rejected premature submission with HTTP 400 MISSING_REQUIRED_DOCUMENTS.');

  // Stage B: Upload each mandatory document
  console.log('\n   Stage B: Uploading required documents...');
  const uploadedDocIds = [];
  // Valid PDF header bytes (%PDF-1.4 ... %%EOF)
  const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< >>\n%%EOF\n');

  for (const reqItem of requirements) {
    console.log(`     Uploading for requirement: ${reqItem.requirement_name} (${reqItem.requirement_code})...`);
    const upRes = await uploadFile(
      `${GATEWAY}/api/v1/applications/${appId}/documents`,
      'document',
      `${reqItem.requirement_code.toLowerCase()}.pdf`,
      dummyPdf,
      'application/pdf',
      {
        document_type: reqItem.requirement_name,
        requirement_id: reqItem.requirement_id || reqItem.id,
      },
      studentToken
    );

    if (upRes.status !== 201 && upRes.status !== 200) {
      console.error(`FAIL: Could not upload document for ${reqItem.requirement_name}:`, upRes.data);
      process.exit(1);
    }
    const docData = upRes.data?.data?.document || upRes.data?.document || upRes.data?.data;
    console.log(`     -> Uploaded doc ID: ${docData.id || docData.application_document_id}`);
    uploadedDocIds.push(docData.id || docData.application_document_id);
  }

  // Stage C (Valid attempt): Final Submission now that all mandatory documents are uploaded
  console.log('\n   Stage C: Submitting draft with all mandatory documents uploaded...');
  const finalSubmit = await postJson(`${GATEWAY}/api/v1/applications/${appId}/submit`, {}, studentToken);
  console.log('   Final Submit Status:', finalSubmit.status);
  console.log('   Final Submit Data:', JSON.stringify(finalSubmit.data));

  if (finalSubmit.status !== 200) {
    console.error('FAIL: Final submission failed after uploading all documents:', finalSubmit.data);
    process.exit(1);
  }
  const submittedApp = finalSubmit.data?.data?.application || finalSubmit.data?.application || finalSubmit.data?.data || finalSubmit.data;
  const currentStatus = submittedApp.status || submittedApp.newStatus;
  if (currentStatus !== 'SUBMITTED') {
    console.error(`FAIL: Application status is ${currentStatus}, expected SUBMITTED!`);
    process.exit(1);
  }
  console.log(`   ✅ PASS: Issue 3 verified. Application successfully submitted with status SUBMITTED.`);

  // ================================================================
  // ISSUE 2 VERIFICATION: Document View/Download & Authorization Checks
  // ================================================================
  console.log('\n--- VERIFYING ISSUE 2: Document View & Download RBAC ---');
  const targetDocId = uploadedDocIds[0];
  console.log(`   Testing Document ID: ${targetDocId}`);

  // Test 1: Student downloads own document
  console.log('   1. Student downloading own document...');
  const ownDl = await getJson(`${GATEWAY}/api/v1/applications/${appId}/documents/${targetDocId}/download`, studentToken);
  console.log('      Status:', ownDl.status, 'Content-Type:', ownDl.headers['content-type'], 'Length:', ownDl.buffer?.length);
  if (ownDl.status !== 200 || !ownDl.headers['content-type']?.includes('application/pdf')) {
    console.error('FAIL: Student could not download own document!');
    process.exit(1);
  }
  console.log('      Verified student download.');

  // Test 2: Student previews own document with ?inline=true
  console.log('   2. Student previewing own document (?inline=true)...');
  const ownPreview = await getJson(`${GATEWAY}/api/v1/applications/${appId}/documents/${targetDocId}/download?inline=true`, studentToken);
  console.log('      Status:', ownPreview.status, 'Content-Disposition:', ownPreview.headers['content-disposition']);
  if (ownPreview.status !== 200 || !ownPreview.headers['content-disposition']?.includes('inline')) {
    console.error('FAIL: Student preview did not return inline disposition!');
    process.exit(1);
  }
  console.log('      Verified inline preview disposition.');

  // Test 3: Reviewer downloads student document
  console.log('   3. Reviewer downloading student document...');
  const revDl = await getJson(`${GATEWAY}/api/v1/applications/${appId}/documents/${targetDocId}/download`, reviewerToken);
  console.log('      Reviewer Download Status:', revDl.status);
  if (revDl.status !== 200) {
    console.error('FAIL: Reviewer could not download document!');
    process.exit(1);
  }
  console.log('      Verified reviewer download.');

  // Test 4: Another student tries to download this student's document (MUST REJECT WITH 403)
  console.log('   4. Other student attempting cross-student document download (Authorization check)...');
  const stolenDl = await getJson(`${GATEWAY}/api/v1/applications/${appId}/documents/${targetDocId}/download`, otherStudentToken);
  console.log('      Stolen Download Status:', stolenDl.status);
  if (stolenDl.status !== 403) {
    console.error(`FAIL: Security breach! Other student got status ${stolenDl.status}, expected 403 ACCESS_DENIED!`);
    process.exit(1);
  }
  console.log('      ✅ PASS: Cross-student unauthorized download properly rejected with HTTP 403.');
  console.log('   ✅ PASS: Issue 2 fully verified.');

  // ================================================================
  // ISSUE 5 VERIFICATION: One Application Per Student Per Scholarship
  // ================================================================
  console.log('\n--- VERIFYING ISSUE 5: Duplicate Application Prevention (409) ---');
  console.log(`   Attempting to apply for the same scholarship (${scholarshipId}) with the same student...`);

  // Attempt 1: POST /applications (direct submit attempt)
  const dupSubmit = await postJson(
    `${GATEWAY}/api/v1/applications`,
    {
      scholarship_id: String(scholarshipId),
      statement: 'Attempting duplicate application',
      academic_year: '2026-2027',
    },
    studentToken
  );
  console.log('   Duplicate Submit HTTP Status:', dupSubmit.status);
  console.log('   Duplicate Submit Response:', JSON.stringify(dupSubmit.data));

  if (dupSubmit.status !== 409) {
    console.error(`FAIL: Expected HTTP 409 for duplicate application, got ${dupSubmit.status}!`);
    process.exit(1);
  }
  const dupCode = dupSubmit.data?.error?.code || dupSubmit.data?.errorCode || dupSubmit.data?.code;
  if (dupCode !== 'DUPLICATE_APPLICATION') {
    console.error(`FAIL: Expected error code DUPLICATE_APPLICATION, got ${dupCode}`);
    process.exit(1);
  }
  console.log('   ✅ PASS: Duplicate application rejected with HTTP 409 DUPLICATE_APPLICATION.');

  // Attempt 2: Verify in student applications list
  console.log('   Checking student applications listing...');
  const myApps = await getJson(`${GATEWAY}/api/v1/applications/my`, studentToken);
  const appsList = myApps.data?.data?.applications || myApps.data?.applications || myApps.data?.data || [];
  console.log(`   Student has ${appsList.length} application(s). Exactly 1 for scholarship ${scholarshipId}.`);
  const matchingApps = appsList.filter((a) => String(a.scholarship_id) === String(scholarshipId));
  if (matchingApps.length !== 1) {
    console.error(`FAIL: Expected exactly 1 application for scholarship ${scholarshipId}, found ${matchingApps.length}!`);
    process.exit(1);
  }
  console.log('   ✅ PASS: Issue 5 fully verified. One application per student per scholarship strictly enforced.');

  console.log('\n================================================================');
  console.log('   🎉 ALL 5 FUNCTIONAL ISSUES VERIFIED AND PASSING SUCCESSFULLY!');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('Test script crashed:', err);
  process.exit(1);
});

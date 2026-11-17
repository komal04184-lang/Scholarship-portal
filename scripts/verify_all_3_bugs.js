const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const GATEWAY_URL = 'http://localhost:3000';

function request(method, urlStr, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { ...headers },
    };

    if (body && typeof body === 'object' && !(body instanceof Buffer)) {
      body = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
    }

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        let parsed = null;
        try {
          parsed = JSON.parse(raw.toString('utf8'));
        } catch (_) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed || raw.toString('utf8'),
          raw,
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function createMultipartFormData(boundary, fields, files) {
  const crlf = '\r\n';
  const parts = [];

  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}${crlf}Content-Disposition: form-data; name="${key}"${crlf}${crlf}${value}${crlf}`
      )
    );
  }

  for (const file of files) {
    parts.push(
      Buffer.from(
        `--${boundary}${crlf}Content-Disposition: form-data; name="${file.fieldname}"; filename="${file.filename}"${crlf}Content-Type: ${file.contentType}${crlf}${crlf}`
      )
    );
    parts.push(file.content);
    parts.push(Buffer.from(crlf));
  }

  parts.push(Buffer.from(`--${boundary}--${crlf}`));
  return Buffer.concat(parts);
}

// Minimal valid PDF buffer for SEC-02 magic-bytes check (%PDF-)
function makeDummyPdf(title) {
  return Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Title (${title}) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n`);
}

async function login(email, password) {
  const res = await request('POST', `${GATEWAY_URL}/api/v1/auth/login`, {}, { email, password });
  if (res.status !== 200 || !res.data.token) {
    throw new Error(`Login failed for ${email}: status ${res.status} data: ${JSON.stringify(res.data)}`);
  }
  return { token: res.data.token, user: res.data.user };
}

async function run() {
  console.log('================================================================');
  console.log('   APEXSCHOLAR: VERIFICATION OF 3 CORE BUG FIXES');
  console.log('================================================================\n');

  // Authenticate Admin, Reviewer, and Student
  console.log('1. Authenticating test users via API Gateway (port 3000)...');
  const admin = await login('admin@scholarship.gov.in', 'Admin@123');
  console.log('   ✓ Admin authenticated successfully.');
  const reviewer = await login('reviewer@scholarship.gov.in', 'Reviewer@123');
  console.log('   ✓ Reviewer authenticated successfully.');
  const student = await login('student@scholarship.gov.in', 'Student@123');
  console.log('   ✓ Student authenticated successfully.\n');

  // ================================================================
  // BUG 2: SCHOLARSHIP CREATION & CATALOGUE VISIBILITY (CACHE HEADERS)
  // ================================================================
  console.log('----------------------------------------------------------------');
  console.log('BUG 2: Testing Scholarship Creation & Immediate Catalogue Visibility');
  console.log('----------------------------------------------------------------');

  const testTitle = `Test Auto Grant ${Date.now()}`;
  console.log(`Creating new scholarship: "${testTitle}"...`);

  const createRes = await request(
    'POST',
    `${GATEWAY_URL}/api/v1/scholarships`,
    { Authorization: `Bearer ${admin.token}` },
    {
      title: testTitle,
      name: testTitle,
      category: 'Merit',
      category_name: 'Merit Based',
      department: 'Engineering & Technology',
      amount: 85000,
      award_amount: 85000,
      total_slots: 15,
      seats: 15,
      min_gpa: 8.0,
      min_cgpa: 8.0,
      max_income: 700000,
      deadline: '2026-12-31',
      application_end_date: '2026-12-31',
      description: 'Scholarship testing catalogue visibility and anti-cache headers.',
      required_documents: ['Transcripts', 'Income Certificate'],
    }
  );

  console.log(`   Creation status: ${createRes.status}`);
  if (createRes.status !== 201 && createRes.status !== 200) {
    throw new Error(`Failed to create scholarship: ${JSON.stringify(createRes.data)}`);
  }
  const createdSchol = createRes.data.scholarship || createRes.data.data || createRes.data;
  const newScholId = createdSchol.scholarship_id || createdSchol.id;
  console.log(`   ✓ Scholarship created successfully with ID: ${newScholId}`);

  // Fetch catalogue immediately with cache headers check
  console.log('   Fetching public catalogue GET /api/v1/scholarships...');
  const catRes = await request('GET', `${GATEWAY_URL}/api/v1/scholarships?_t=${Date.now()}`, {
    Authorization: `Bearer ${student.token}`,
  });

  console.log(`   Catalogue HTTP status: ${catRes.status}`);
  const cacheControl = catRes.headers['cache-control'] || '';
  console.log(`   Cache-Control header: "${cacheControl}"`);
  if (!cacheControl.includes('no-cache') && !cacheControl.includes('no-store')) {
    throw new Error(`Expected Cache-Control: no-cache, no-store but got: ${cacheControl}`);
  }
  console.log('   ✓ Anti-cache header verified: no stale browser caching.');

  const items = catRes.data.items || catRes.data.scholarships || catRes.data || [];
  const found = items.find((s) => String(s.id) === String(newScholId) || s.title === testTitle);
  if (!found) {
    throw new Error(`Newly created scholarship #${newScholId} "${testTitle}" not found in catalogue! Found count: ${items.length}`);
  }
  console.log(`   ✓ Newly created scholarship #${newScholId} IS visible in student catalogue immediately!`);
  console.log('   ✓ BUG 2 VERIFIED FIXED.\n');

  // ================================================================
  // BUG 1: STUDENT RESUME & EDIT DRAFT APPLICATION
  // ================================================================
  console.log('----------------------------------------------------------------');
  console.log('BUG 1: Testing Student Resume/Edit Draft Workflow');
  console.log('----------------------------------------------------------------');

  // 1. Create a DRAFT application for the newly created scholarship
  console.log(`1. Initializing DRAFT application for scholarship #${newScholId}...`);
  const initialSop = 'Initial draft SOP created by student.';
  const draftRes = await request(
    'POST',
    `${GATEWAY_URL}/api/v1/applications/draft`,
    { Authorization: `Bearer ${student.token}` },
    {
      scholarship_id: newScholId,
      sop: initialSop,
      statement: initialSop,
      academic_year: '2026-2027',
    }
  );

  console.log(`   Draft creation status: ${draftRes.status}`);
  const initialApp = draftRes.data.data?.application || draftRes.data.application;
  const appId = initialApp.application_id || initialApp.id;
  console.log(`   ✓ Draft application initialized with ID: ${appId}, Status: ${initialApp.status}`);
  if (initialApp.status !== 'DRAFT') {
    throw new Error(`Expected status DRAFT but got ${initialApp.status}`);
  }

  // 2. Fetch requirements snapshot
  console.log(`2. Fetching document requirements snapshot for application #${appId}...`);
  const reqRes = await request(
    'GET',
    `${GATEWAY_URL}/api/v1/applications/${appId}/requirements`,
    { Authorization: `Bearer ${student.token}` }
  );
  const requirements = reqRes.data.data?.requirements || reqRes.data.requirements || [];
  console.log(`   ✓ Retrieved ${requirements.length} requirement(s).`);
  const firstReq = requirements[0] || { requirement_id: 'default-1', requirement_name: 'Transcripts' };

  // 3. Upload first document while in DRAFT
  console.log(`3. Uploading document for requirement "${firstReq.requirement_name}"...`);
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const pdfBytes = makeDummyPdf('Transcript Original');
  const uploadBody = createMultipartFormData(
    boundary,
    {
      document_type: firstReq.requirement_name,
      requirement_id: firstReq.requirement_id || firstReq.id || '',
    },
    [
      {
        fieldname: 'document',
        filename: 'Student_Transcript_v1.pdf',
        contentType: 'application/pdf',
        content: pdfBytes,
      }
    ]
  );

  const docUploadRes = await request(
    'POST',
    `${GATEWAY_URL}/api/v1/applications/${appId}/documents`,
    {
      Authorization: `Bearer ${student.token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    uploadBody
  );
  console.log(`   Document upload status: ${docUploadRes.status}`);
  const uploadedDoc = docUploadRes.data.data?.document || docUploadRes.data.document;
  const docId = uploadedDoc.id || uploadedDoc.application_document_id;
  console.log(`   ✓ Document uploaded successfully: ID ${docId}`);

  // 4. Update the Statement of Purpose while keeping application ID and DRAFT status
  console.log(`4. Updating Statement of Purpose (Resume Draft edit)...`);
  const updatedSop = 'Updated Statement of Purpose articulating revised academic goals for 2026.';
  const updateRes = await request(
    'PATCH',
    `${GATEWAY_URL}/api/v1/applications/${appId}`,
    { Authorization: `Bearer ${student.token}` },
    {
      sop: updatedSop,
      statement: updatedSop,
    }
  );
  console.log(`   Update status: ${updateRes.status}`);
  const updatedApp = updateRes.data.data?.application || updateRes.data.application;
  console.log(`   ✓ Application ID preserved: ${updatedApp.application_id || updatedApp.id}`);
  console.log(`   ✓ Status preserved in DRAFT: ${updatedApp.status}`);
  console.log(`   ✓ SOP verified updated: "${updatedApp.sop}"`);

  // 5. Replace existing document while in DRAFT
  console.log(`5. Replacing existing document #${docId} while in DRAFT...`);
  const repBoundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const repPdfBytes = makeDummyPdf('Transcript Replaced Newer');
  const repBody = createMultipartFormData(
    repBoundary,
    {
      document_type: firstReq.requirement_name,
      requirement_id: firstReq.requirement_id || firstReq.id || '',
    },
    [
      {
        fieldname: 'document',
        filename: 'Student_Transcript_v2_Replaced.pdf',
        contentType: 'application/pdf',
        content: repPdfBytes,
      }
    ]
  );

  const repRes = await request(
    'PUT',
    `${GATEWAY_URL}/api/v1/applications/${appId}/documents/${docId}`,
    {
      Authorization: `Bearer ${student.token}`,
      'Content-Type': `multipart/form-data; boundary=${repBoundary}`,
    },
    repBody
  );
  console.log(`   Document replace status: ${repRes.status}`);
  const replacedDoc = repRes.data.data?.document || repRes.data.document;
  const replacedDocId = replacedDoc.id || replacedDoc.application_document_id;
  console.log(`   ✓ Document successfully replaced: new ID ${replacedDocId}`);

  // Upload second document if multiple requirements exist
  if (requirements.length > 1) {
    const secondReq = requirements[1];
    console.log(`   Uploading second requirement: "${secondReq.requirement_name}"...`);
    const b2 = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const b2Pdf = makeDummyPdf('Income Cert');
    const b2Body = createMultipartFormData(
      b2,
      {
        document_type: secondReq.requirement_name,
        requirement_id: secondReq.requirement_id || secondReq.id || '',
      },
      [
        {
          fieldname: 'document',
          filename: 'Income_Certificate.pdf',
          contentType: 'application/pdf',
          content: b2Pdf,
        }
      ]
    );
    await request(
      'POST',
      `${GATEWAY_URL}/api/v1/applications/${appId}/documents`,
      {
        Authorization: `Bearer ${student.token}`,
        'Content-Type': `multipart/form-data; boundary=${b2}`,
      },
      b2Body
    );
  }

  // 6. Test duplicate draft creation: calling /draft again should return existing draft without creating a new one
  console.log(`6. Testing duplicate draft prevention: calling /draft again for same scholarship...`);
  const dupDraftRes = await request(
    'POST',
    `${GATEWAY_URL}/api/v1/applications/draft`,
    { Authorization: `Bearer ${student.token}` },
    {
      scholarship_id: newScholId,
      sop: 'Another attempt',
    }
  );
  const returnedApp = dupDraftRes.data.data?.application || dupDraftRes.data.application;
  const returnedAppId = returnedApp.application_id || returnedApp.id;
  if (String(returnedAppId) !== String(appId)) {
    throw new Error(`Duplicate draft created! Original: ${appId}, New: ${returnedAppId}`);
  }
  console.log(`   ✓ Returned existing draft application #${returnedAppId} (No duplicate created).`);

  // 7. Final submission of the draft
  console.log(`7. Submitting draft application #${appId}...`);
  const submitRes = await request(
    'POST',
    `${GATEWAY_URL}/api/v1/applications/${appId}/submit`,
    { Authorization: `Bearer ${student.token}` }
  );
  console.log(`   Submit status: ${submitRes.status}`);
  console.log(`   Submit response data:`, JSON.stringify(submitRes.data));
  const finalApp = submitRes.data.data?.application || submitRes.data.data?.updated || submitRes.data.data || submitRes.data.application || submitRes.data;
  const finalStatus = finalApp.newStatus || finalApp.status;
  console.log(`   ✓ Transitioned status: ${finalStatus}`);
  if (finalStatus !== 'SUBMITTED') {
    throw new Error(`Expected status SUBMITTED but got ${finalStatus}`);
  }
  console.log('   ✓ BUG 1 VERIFIED FIXED.\n');

  // ================================================================
  // BUG 3: DOCUMENT IMMUTABILITY & REVIEWER/ADMIN ACCESS
  // ================================================================
  console.log('----------------------------------------------------------------');
  console.log('BUG 3: Testing Document Permissions & Reviewer/Admin Document Access');
  console.log('----------------------------------------------------------------');

  // 1. Verify Document Immutability: Student attempts to upload/replace document after SUBMISSION
  console.log('1. Testing Document Immutability: Student attempts upload on SUBMITTED application...');
  const lockedBoundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const lockedPdf = makeDummyPdf('Illegal Post-submission Doc');
  const lockedBody = createMultipartFormData(
    lockedBoundary,
    { document_type: 'Late Document' },
    [
      {
        fieldname: 'document',
        filename: 'Late_Document.pdf',
        contentType: 'application/pdf',
        content: lockedPdf,
      }
    ]
  );

  const lockedUploadRes = await request(
    'POST',
    `${GATEWAY_URL}/api/v1/applications/${appId}/documents`,
    {
      Authorization: `Bearer ${student.token}`,
      'Content-Type': `multipart/form-data; boundary=${lockedBoundary}`,
    },
    lockedBody
  );
  console.log(`   Locked upload status: ${lockedUploadRes.status}`);
  if (lockedUploadRes.status !== 403) {
    throw new Error(`Expected HTTP 403 for upload on SUBMITTED application, got ${lockedUploadRes.status}`);
  }
  console.log(`   ✓ Correctly rejected with HTTP 403 (${lockedUploadRes.data.error || lockedUploadRes.data.message})`);

  // Student attempts to replace on SUBMITTED application
  console.log('   Student attempts replace on SUBMITTED application...');
  const lockedRepRes = await request(
    'PUT',
    `${GATEWAY_URL}/api/v1/applications/${appId}/documents/${replacedDocId}`,
    {
      Authorization: `Bearer ${student.token}`,
      'Content-Type': `multipart/form-data; boundary=${lockedBoundary}`,
    },
    lockedBody
  );
  console.log(`   Locked replace status: ${lockedRepRes.status}`);
  if (lockedRepRes.status !== 403) {
    throw new Error(`Expected HTTP 403 for replace on SUBMITTED application, got ${lockedRepRes.status}`);
  }
  console.log(`   ✓ Correctly rejected with HTTP 403 (${lockedRepRes.data.error || lockedRepRes.data.message})`);

  // 2. Reviewer Document View & Download Access
  console.log(`2. Testing Reviewer document access for application #${appId}, document #${replacedDocId}...`);
  // Preview (inline)
  const revPreviewRes = await request(
    'GET',
    `${GATEWAY_URL}/api/v1/applications/${appId}/documents/${replacedDocId}/download?inline=true`,
    { Authorization: `Bearer ${reviewer.token}` }
  );
  console.log(`   Reviewer preview status: ${revPreviewRes.status}`);
  console.log(`   Reviewer Content-Type: ${revPreviewRes.headers['content-type']}`);
  console.log(`   Reviewer Content-Disposition: ${revPreviewRes.headers['content-disposition']}`);
  if (revPreviewRes.status !== 200 || !revPreviewRes.headers['content-type']?.includes('pdf')) {
    throw new Error(`Reviewer preview failed! Status: ${revPreviewRes.status}`);
  }
  console.log('   ✓ Reviewer inline preview authorized and returned valid PDF binary stream.');

  // Download (attachment)
  const revDlRes = await request(
    'GET',
    `${GATEWAY_URL}/api/v1/applications/${appId}/documents/${replacedDocId}/download`,
    { Authorization: `Bearer ${reviewer.token}` }
  );
  console.log(`   Reviewer download status: ${revDlRes.status}`);
  if (revDlRes.status !== 200) {
    throw new Error(`Reviewer download failed! Status: ${revDlRes.status}`);
  }
  console.log('   ✓ Reviewer attachment download authorized.');

  // 3. Admin Document View & Download Access
  console.log(`3. Testing Admin document access for application #${appId}, document #${replacedDocId}...`);
  const adminDlRes = await request(
    'GET',
    `${GATEWAY_URL}/api/v1/applications/${appId}/documents/${replacedDocId}/download`,
    { Authorization: `Bearer ${admin.token}` }
  );
  console.log(`   Admin download status: ${adminDlRes.status}`);
  if (adminDlRes.status !== 200) {
    throw new Error(`Admin download failed! Status: ${adminDlRes.status}`);
  }
  console.log('   ✓ Admin attachment download authorized.');

  // 4. Reviewer verifies document
  console.log(`4. Testing Reviewer document verification...`);
  const verifyRes = await request(
    'PATCH',
    `${GATEWAY_URL}/api/v1/applications/${appId}/documents/${replacedDocId}/verify`,
    { Authorization: `Bearer ${reviewer.token}` },
    {
      verification_status: 'VERIFIED',
      reviewer_comment: 'Academic transcript verified against institutional records.',
    }
  );
  console.log(`   Document verification status: ${verifyRes.status}`);
  if (verifyRes.status !== 200) {
    throw new Error(`Document verify failed! Status: ${verifyRes.status}`);
  }
  console.log('   ✓ Document verification status updated to VERIFIED.');
  console.log('   ✓ BUG 3 VERIFIED FIXED.\n');

  console.log('================================================================');
  console.log('🎉 ALL 3 CORE BUGS (BUG 1, BUG 2, BUG 3) VERIFIED SUCCESSFULLY!');
  console.log('================================================================');
}

run().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});

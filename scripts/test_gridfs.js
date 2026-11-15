// GridFS Live Test - Part A: Document Storage Verification
// Tests: upload, retrieve, download, delete, auth, MongoDB unavailability behavior
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SVC_TOKEN = 'internal_super_secret_token_change_in_prod';
const BASE_APP = 3003;
const BASE_ID = 3001;

let passed = 0;
let failed = 0;
let skipped = 0;

function check(label, condition, details = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label} ${details}`);
    failed++;
  }
}

function skip(label, reason) {
  console.log(`  ⚠️  SKIP: ${label} — ${reason}`);
  skipped++;
}

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
        try { resolve({ status: res.statusCode, body: JSON.parse(d), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, body: d, headers: res.headers }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

// Multipart form upload helper
function uploadFile(port, urlPath, filePath, fieldName, extraHeaders, extraFields) {
  return new Promise((resolve, reject) => {
    const boundary = `----FormBoundary${crypto.randomBytes(8).toString('hex')}`;
    const fileBuffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mimeMap = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
    const mime = mimeMap[ext] || 'application/octet-stream';

    let body = '';
    // Add extra text fields
    for (const [k, v] of Object.entries(extraFields || {})) {
      body += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
    }
    const bodyPrefix = Buffer.from(body + `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mime}\r\n\r\n`);
    const bodySuffix = Buffer.from(`\r\n--${boundary}--\r\n`);
    const fullBody = Buffer.concat([bodyPrefix, fileBuffer, bodySuffix]);

    const opts = {
      hostname: 'localhost',
      port,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length,
        ...extraHeaders,
      },
    };

    const req = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, body: d, headers: res.headers }); }
      });
    });
    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}

// Download helper - returns buffer
function downloadFile(port, urlPath, extraHeaders) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port, path: urlPath, method: 'GET', headers: extraHeaders || {} };
    const r = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks), headers: res.headers }));
    });
    r.on('error', reject);
    r.end();
  });
}

async function main() {
  const SH = { 'X-Service-Token': SVC_TOKEN };

  console.log('=== PART A: GridFS and Document Storage Tests ===\n');

  // ---- SETUP: Get a student token and application ----
  console.log('--- Setup: Creating test student ---');
  const ts = Date.now();
  const r0 = await httpReq(BASE_ID, '/api/v1/auth/register', 'POST', {
    username: `doctest${ts}`,
    email: `doctest.${ts}@example.com`,
    password: 'TestPass123!',
    role: 'student',
  }, {});
  const studentToken = r0.body?.token;
  const studentId = r0.body?.user?.id;
  console.log('Student registered:', r0.status, 'ID:', studentId, 'Token:', studentToken ? 'yes' : 'no');

  if (!studentToken) {
    console.error('Cannot proceed without student token');
    return;
  }

  // Get a scholarship
  const rSch = await httpReq(3002, '/api/v1/scholarships', 'GET', null, SH);
  const scholarship = (rSch.body?.items || [])[0];
  if (!scholarship) { console.error('No scholarship found'); return; }
  console.log('Scholarship:', scholarship.id, scholarship.title);

  // Submit application
  const rApp = await httpReq(BASE_APP, '/api/v1/applications', 'POST', {
    scholarship_id: String(scholarship.id),
    statement: 'Document upload test application.',
    sop: 'SOP for document upload test.',
    cgpa: 8.0,
    family_income: 100000,
    annual_income: 100000,
  }, { 'Authorization': `Bearer ${studentToken}` });
  const appId = rApp.body?.data?.application?.id;
  console.log('Application created:', rApp.status, 'ID:', appId);
  if (!appId) { console.error('No application ID'); return; }

  // ---- Create a small test PDF file ----
  const testPdfPath = path.join(__dirname, '..', 'tmp_test_doc.pdf');
  const pdfContent = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n190\n%%EOF');
  fs.writeFileSync(testPdfPath, pdfContent);
  console.log('Test PDF created:', testPdfPath, pdfContent.length, 'bytes');

  // ---- TEST 1: Upload document to application ----
  console.log('\n[Test 1] Document upload — PDF to application');
  const rUpload = await uploadFile(
    BASE_APP,
    `/api/v1/applications/${appId}/documents`,
    testPdfPath,
    'document',
    { 'Authorization': `Bearer ${studentToken}` },
    { document_type: 'Identity Proof', requirement_id: '' }
  );
  console.log('Upload:', rUpload.status, JSON.stringify(rUpload.body).slice(0, 300));
  check('Upload succeeds (201)', rUpload.status === 201, `got ${rUpload.status}: ${JSON.stringify(rUpload.body).slice(0,100)}`);
  const docId = rUpload.body?.data?.document?.id;
  const gridfsId = rUpload.body?.data?.document?.gridfs_id;
  console.log('  Document ID:', docId, '| GridFS ID:', gridfsId);
  check('Document metadata saved with ID', !!docId, `docId: ${docId}`);
  check('Document associated with application', rUpload.body?.data?.document?.application_id === appId,
    `expected ${appId}, got ${rUpload.body?.data?.document?.application_id}`);
  check('Verification status is PENDING', rUpload.body?.data?.document?.verification_status === 'PENDING');
  check('Correct MIME type stored', rUpload.body?.data?.document?.mime_type === 'application/pdf',
    `got ${rUpload.body?.data?.document?.mime_type}`);
  check('File size stored', (rUpload.body?.data?.document?.file_size_bytes || 0) > 0);
  if (gridfsId) {
    console.log('  GridFS ID present — MongoDB storage confirmed ✅');
    check('GridFS ID is non-empty string', typeof gridfsId === 'string' && gridfsId.length > 0);
  } else {
    console.log('  GridFS ID absent — MongoDB unavailable, local fallback active');
    skip('GridFS ID present', 'MongoDB not in use or GridFS unavailable');
  }

  // ---- TEST 2: List documents ----
  console.log('\n[Test 2] List documents for application');
  const rList = await httpReq(BASE_APP, `/api/v1/applications/${appId}/documents`, 'GET', null,
    { 'Authorization': `Bearer ${studentToken}` }
  );
  check('List documents 200', rList.status === 200, `got ${rList.status}`);
  const docs = rList.body?.data?.documents || [];
  check('At least 1 document listed', docs.length >= 1, `found ${docs.length}`);
  console.log('  Documents listed:', docs.length);

  // ---- TEST 3: Get document metadata ----
  if (docId) {
    console.log('\n[Test 3] Get document metadata by ID');
    const rMeta = await httpReq(BASE_APP, `/api/v1/applications/${appId}/documents/${docId}`, 'GET', null,
      { 'Authorization': `Bearer ${studentToken}` }
    );
    check('Get document metadata 200', rMeta.status === 200, `got ${rMeta.status}`);
    check('Metadata has original_filename', !!rMeta.body?.data?.document?.original_filename);
    check('Metadata has checksum', !!rMeta.body?.data?.document?.checksum_sha256);
  }

  // ---- TEST 4: Download document ----
  if (docId) {
    console.log('\n[Test 4] Download document');
    const rDown = await downloadFile(BASE_APP,
      `/api/v1/applications/${appId}/documents/${docId}/download`,
      { 'Authorization': `Bearer ${studentToken}` }
    );
    check('Download succeeds 200', rDown.status === 200, `got ${rDown.status}`);
    check('Download returns file bytes', rDown.buffer.length > 0, `got ${rDown.buffer.length} bytes`);
    check('Content-Type header set', !!(rDown.headers['content-type']), `got: ${rDown.headers['content-type']}`);
    check('Content-Disposition set', !!(rDown.headers['content-disposition']), `got: ${rDown.headers['content-disposition']}`);
    console.log('  Download size:', rDown.buffer.length, 'bytes | Content-Type:', rDown.headers['content-type']);
  }

  // ---- TEST 5: Access control — different student cannot see docs ----
  console.log('\n[Test 5] Authorization — another student cannot access documents');
  const ts2 = Date.now();
  const r0b = await httpReq(BASE_ID, '/api/v1/auth/register', 'POST', {
    username: `doctest2_${ts2}`,
    email: `doctest2.${ts2}@example.com`,
    password: 'TestPass123!',
    role: 'student',
  }, {});
  const otherToken = r0b.body?.token;
  if (otherToken) {
    const rOther = await httpReq(BASE_APP, `/api/v1/applications/${appId}/documents`, 'GET', null,
      { 'Authorization': `Bearer ${otherToken}` }
    );
    check('Other student denied (403)', rOther.status === 403, `got ${rOther.status}`);
  } else {
    skip('Other student access denied', 'Could not create second student');
  }

  // ---- TEST 6: Reviewer/admin can access documents ----
  console.log('\n[Test 6] Authorization — service token (admin role) can access documents');
  const rAdmin = await httpReq(BASE_APP, `/api/v1/applications/${appId}/documents`, 'GET', null, SH);
  check('Service token can list documents (200)', rAdmin.status === 200, `got ${rAdmin.status}`);

  // ---- TEST 7: File type validation — reject executable ----
  console.log('\n[Test 7] File type validation — reject disallowed MIME type');
  const fakeExePath = path.join(__dirname, '..', 'tmp_test_bad.exe');
  fs.writeFileSync(fakeExePath, Buffer.from('MZ\x90\x00fake exe'));
  const rBadType = await uploadFile(
    BASE_APP,
    `/api/v1/applications/${appId}/documents`,
    fakeExePath,
    'document',
    { 'Authorization': `Bearer ${studentToken}` },
    { document_type: 'Bad File' }
  );
  check('EXE upload rejected (400)', rBadType.status === 400, `got ${rBadType.status}: ${JSON.stringify(rBadType.body).slice(0,100)}`);
  fs.unlinkSync(fakeExePath);

  // ---- TEST 8: File size validation ----
  console.log('\n[Test 8] File size validation — reject oversized file');
  const largePath = path.join(__dirname, '..', 'tmp_large.pdf');
  // Create 11MB file (over 10MB limit)
  const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 0);
  largeBuffer.write('%PDF-1.4', 0);
  fs.writeFileSync(largePath, largeBuffer);
  const rLarge = await uploadFile(
    BASE_APP,
    `/api/v1/applications/${appId}/documents`,
    largePath,
    'document',
    { 'Authorization': `Bearer ${studentToken}` },
    { document_type: 'Large File' }
  );
  check('Oversized file rejected (400 or 413)', rLarge.status === 400 || rLarge.status === 413,
    `got ${rLarge.status}: ${JSON.stringify(rLarge.body).slice(0,100)}`);
  fs.unlinkSync(largePath);

  // ---- TEST 9: Document verification by admin ----
  if (docId) {
    console.log('\n[Test 9] Document verification by admin/reviewer');
    const rVerify = await httpReq(BASE_APP,
      `/api/v1/applications/${appId}/documents/${docId}/verify`,
      'PATCH',
      { status: 'VERIFIED', reviewer_comment: 'Document looks valid' },
      SH
    );
    check('Document verification 200', rVerify.status === 200, `got ${rVerify.status}: ${JSON.stringify(rVerify.body).slice(0,100)}`);
    check('Status updated to VERIFIED', rVerify.body?.data?.document?.verification_status === 'VERIFIED',
      `got: ${rVerify.body?.data?.document?.verification_status}`);
  }

  // ---- TEST 10: Delete document ----
  if (docId) {
    console.log('\n[Test 10] Delete document');
    const rDel = await httpReq(BASE_APP,
      `/api/v1/applications/${appId}/documents/${docId}`,
      'DELETE',
      null,
      { 'Authorization': `Bearer ${studentToken}` }
    );
    check('Delete succeeds (200)', rDel.status === 200, `got ${rDel.status}: ${JSON.stringify(rDel.body).slice(0,100)}`);

    // Verify document is gone
    if (rDel.status === 200) {
      const rAfterDel = await httpReq(BASE_APP,
        `/api/v1/applications/${appId}/documents/${docId}`,
        'GET',
        null,
        { 'Authorization': `Bearer ${studentToken}` }
      );
      check('Document no longer accessible after delete (404)', rAfterDel.status === 404,
        `got ${rAfterDel.status}`);
    }
  }

  // ---- TEST 11: No file attached ----
  console.log('\n[Test 11] Upload without file — should return 400');
  const rNoFile = await httpReq(BASE_APP,
    `/api/v1/applications/${appId}/documents`,
    'POST',
    { document_type: 'ID Proof' },
    { 'Authorization': `Bearer ${studentToken}` }
  );
  check('No file → 400 or 415', rNoFile.status === 400 || rNoFile.status === 415,
    `got ${rNoFile.status}: ${JSON.stringify(rNoFile.body).slice(0,100)}`);

  // ---- CLEANUP ----
  try { fs.unlinkSync(testPdfPath); } catch (_) {}

  // ---- SUMMARY ----
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Part A Tests: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  if (failed === 0) console.log('✅ All GridFS/Document tests passed');
  else console.log('❌ Some tests failed — review above');
}

main().catch((e) => console.error('FATAL:', e.message, e.stack));

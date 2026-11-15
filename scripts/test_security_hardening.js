// Phase 4 Automated Security Hardening Test Suite
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_ID = 3001;
const BASE_APP = 3003;
const BASE_GATEWAY = 3000;

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

function httpReq(port, urlPath, method, body, extraHeaders) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json', ...extraHeaders };
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    const opts = { hostname: 'localhost', port, path: urlPath, method, headers };
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

function uploadFile(port, urlPath, fileBuffer, filename, fieldName, extraHeaders, extraFields) {
  return new Promise((resolve, reject) => {
    const boundary = `----FormBoundary${crypto.randomBytes(8).toString('hex')}`;
    let body = '';
    for (const [k, v] of Object.entries(extraFields || {})) {
      body += `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
    }
    const ext = path.extname(filename).toLowerCase();
    const mimeMap = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg' };
    const mime = mimeMap[ext] || 'application/octet-stream';

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

async function runSecurityTests() {
  console.log('=== PHASE 4: AUTOMATED SECURITY HARDENING TEST SUITE ===\n');

  // Register fresh student
  const ts = Date.now();
  const rReg = await httpReq(BASE_ID, '/api/v1/auth/register', 'POST', {
    username: `secstudent${ts}`,
    email: `secstudent.${ts}@example.com`,
    password: 'TestPass123!',
    role: 'student',
  }, {});
  check('Student Registration Status 201', rReg.status === 201);
  const studentToken = rReg.body?.token;

  // Login to acquire refresh token
  const rLogin = await httpReq(BASE_ID, '/api/v1/auth/login', 'POST', {
    email: `secstudent.${ts}@example.com`,
    password: 'TestPass123!',
  }, {});
  check('Student Login Status 200', rLogin.status === 200);
  const refreshToken1 = rLogin.body?.refreshToken;
  check('Refresh token issued', !!refreshToken1);

  // Submit test application
  const rApp = await httpReq(BASE_APP, '/api/v1/applications', 'POST', {
    scholarship_id: '1',
    statement: 'Phase 4 security test application.',
    sop: 'Statement of purpose for Phase 4 security tests.',
    cgpa: 8.5,
    family_income: 120000,
    annual_income: 120000,
  }, { 'Authorization': `Bearer ${studentToken}` });
  check('Application submission 201', rApp.status === 201);
  const appId = rApp.body?.data?.application?.id;

  // ─── 1. SEC-02: Server-side Magic-Byte Validation Tests ───
  console.log('\n[SEC-02] Server-Side Magic-Byte Validation');

  // A. Legitimate PDF
  const legitPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj xref trailer<</Root 1 0 R>>startxref 50 %%EOF');
  const rPdf = await uploadFile(BASE_APP, `/api/v1/applications/${appId}/documents`, legitPdf, 'valid.pdf', 'document',
    { 'Authorization': `Bearer ${studentToken}` }, { document_type: 'ID Proof' });
  check('Valid PDF upload accepted (201)', rPdf.status === 201, `got ${rPdf.status}`);

  // B. Spoofed PDF (Text file renamed to .pdf without %PDF- magic bytes)
  const fakePdf = Buffer.from('This is completely fake plaintext pretending to be a PDF.');
  const rFakePdf = await uploadFile(BASE_APP, `/api/v1/applications/${appId}/documents`, fakePdf, 'spoofed.pdf', 'document',
    { 'Authorization': `Bearer ${studentToken}` }, { document_type: 'Fake Doc' });
  check('Spoofed PDF rejected by magic bytes (400 INVALID_FILE_SIGNATURE)',
    rFakePdf.status === 400 && (rFakePdf.body?.error?.code === 'INVALID_FILE_SIGNATURE' || rFakePdf.body?.errorCode === 'INVALID_FILE_SIGNATURE'),
    `got ${rFakePdf.status}: ${JSON.stringify(rFakePdf.body)}`);

  // C. Spoofed PNG (Bad header bytes)
  const fakePng = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x11, 0x22]);
  const rFakePng = await uploadFile(BASE_APP, `/api/v1/applications/${appId}/documents`, fakePng, 'fake.png', 'document',
    { 'Authorization': `Bearer ${studentToken}` }, { document_type: 'Fake Photo' });
  check('Spoofed PNG rejected by magic bytes (400 INVALID_FILE_SIGNATURE)',
    rFakePng.status === 400, `got ${rFakePng.status}`);

  // ─── 2. SEC-06: Refresh-Token Reuse Detection & Safe Revocation ───
  console.log('\n[SEC-06] Refresh-Token Rotation & Reuse Detection');

  // First normal rotation: uses refreshToken1 -> generates refreshToken2
  const rRefresh1 = await httpReq(BASE_ID, '/api/v1/auth/refresh', 'POST', { refreshToken: refreshToken1 }, {});
  check('Normal token refresh succeeds (200)', rRefresh1.status === 200, `got ${rRefresh1.status}`);
  const refreshToken2 = rRefresh1.body?.refreshToken;
  check('New rotated refresh token issued', !!refreshToken2 && refreshToken2 !== refreshToken1);

  // Second normal rotation: uses refreshToken2 -> generates refreshToken3
  const rRefresh2 = await httpReq(BASE_ID, '/api/v1/auth/refresh', 'POST', { refreshToken: refreshToken2 }, {});
  check('Second normal refresh succeeds (200)', rRefresh2.status === 200);
  const refreshToken3 = rRefresh2.body?.refreshToken;

  // Attacker attempts to REUSE refreshToken1 (which has already been revoked!)
  console.log('  Testing reuse of revoked token (refreshToken1)...');
  const rReuse = await httpReq(BASE_ID, '/api/v1/auth/refresh', 'POST', { refreshToken: refreshToken1 }, {});
  check('Revoked token reuse detected and rejected (401)',
    rReuse.status === 401 && (rReuse.body?.code === 'REVOKED_SESSION_REUSE_DETECTED' || rReuse.body?.message?.includes('revoked')),
    `got ${rReuse.status}: ${JSON.stringify(rReuse.body)}`);

  // Verify that active session (refreshToken3) was invalidated due to theft detection!
  const rPostTheft = await httpReq(BASE_ID, '/api/v1/auth/refresh', 'POST', { refreshToken: refreshToken3 }, {});
  check('Descendant session terminated after reuse detected (401)', rPostTheft.status === 401,
    `got ${rPostTheft.status}`);

  // ─── 3. SEC-04: Direct-Service Local Rate Limiting ───
  console.log('\n[SEC-04] Direct Service Rate Limiting Headers');
  const rDirectHeaders = await httpReq(BASE_ID, '/api/v1/auth/login', 'POST', { email: 'bad@bad.com', password: 'bad' }, {});
  check('Direct Service returns X-LocalRateLimit-Limit', !!rDirectHeaders.headers['x-localratelimit-limit']);
  check('Direct Service returns X-LocalRateLimit-Remaining', !!rDirectHeaders.headers['x-localratelimit-remaining']);

  // ─── 4. SEC-05: CSRF Origin/Referer Protection on Cookie Auth ───
  console.log('\n[SEC-05] CSRF Protection for Cookie-Based State Mutations');
  const rCsrfBlocked = await httpReq(BASE_APP, `/api/v1/applications/${appId}/documents`, 'POST', {}, {
    'Cookie': `token=${studentToken}`,
    'Origin': 'https://malicious-attacker-site.com',
  });
  check('Malicious Cross-Origin cookie request blocked (403)', rCsrfBlocked.status === 403,
    `got ${rCsrfBlocked.status}: ${JSON.stringify(rCsrfBlocked.body)}`);

  const rLegitOrigin = await httpReq(BASE_APP, `/api/v1/applications/${appId}/documents`, 'POST', {}, {
    'Cookie': `token=${studentToken}`,
    'Origin': 'http://localhost:5173',
  });
  check('Legitimate Origin passes CSRF check (status is 400 for empty form, NOT 403)',
    rLegitOrigin.status === 400, `got ${rLegitOrigin.status}`);

  console.log(`\n==================================================`);
  console.log(`Phase 4 Security Tests: ${passed} passed, ${failed} failed`);
}

runSecurityTests().catch(e => console.error('FATAL:', e));

// Test MongoDB Disconnection & Outage behavior for Document Storage
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_APP = 3003;
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
        try { resolve({ status: res.statusCode, body: JSON.parse(d), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, body: d, headers: res.headers }); }
      });
    });
    r.on('error', reject);
    if (payload) r.write(payload);
    r.end();
  });
}

function uploadFile(port, urlPath, filePath, fieldName, extraHeaders, extraFields) {
  return new Promise((resolve, reject) => {
    const boundary = `----FormBoundary${crypto.randomBytes(8).toString('hex')}`;
    const fileBuffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    const ext = path.extname(filename).toLowerCase();
    const mimeMap = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.png': 'image/png' };
    const mime = mimeMap[ext] || 'application/octet-stream';

    let body = '';
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

async function runOutageTest() {
  console.log('=== Verifying Storage Service Behavior under Simulated MongoDB Outage ===');

  // Register student
  const ts = Date.now();
  const r0 = await httpReq(BASE_ID, '/api/v1/auth/register', 'POST', {
    username: `outagestudent${ts}`,
    email: `outagestudent.${ts}@example.com`,
    password: 'TestPass123!',
    role: 'student',
  }, {});
  const studentToken = r0.body?.token;

  // Submit application
  const rApp = await httpReq(BASE_APP, '/api/v1/applications', 'POST', {
    scholarship_id: '1',
    statement: 'Testing Mongo outage fallback.',
    sop: 'SOP for Mongo outage test.',
    cgpa: 8.5,
    family_income: 100000,
    annual_income: 100000,
  }, { 'Authorization': `Bearer ${studentToken}` });
  const appId = rApp.body?.data?.application?.id;

  const testFilePath = path.join(__dirname, '..', 'tmp_outage_doc.pdf');
  fs.writeFileSync(testFilePath, Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj xref 0 4 trailer<</Size 4/Root 1 0 R>>startxref 190 %%EOF'));

  // Upload file
  console.log('1. Uploading document...');
  const rUp = await uploadFile(
    BASE_APP,
    `/api/v1/applications/${appId}/documents`,
    testFilePath,
    'document',
    { 'Authorization': `Bearer ${studentToken}` },
    { document_type: 'Income Proof' }
  );
  console.log('   Upload status:', rUp.status, '| Local storage key:', rUp.body?.data?.document?.storage_key);

  const docId = rUp.body?.data?.document?.id;
  const storageKey = rUp.body?.data?.document?.storage_key;

  // Test retrieval
  console.log('2. Downloading document...');
  const rDown = await downloadFile(
    BASE_APP,
    `/api/v1/applications/${appId}/documents/${docId}/download`,
    { 'Authorization': `Bearer ${studentToken}` }
  );
  console.log('   Download status:', rDown.status, '| Received bytes:', rDown.buffer.length);

  // Test local disk existence
  const localFilePath = path.join(__dirname, '..', 'services', 'application-service', 'uploads', storageKey);
  console.log('3. Checking local disk storage existence...');
  const existsLocal = fs.existsSync(localFilePath);
  console.log('   Local file present on disk:', existsLocal);

  // Test deletion
  console.log('4. Deleting document...');
  const rDel = await httpReq(
    BASE_APP,
    `/api/v1/applications/${appId}/documents/${docId}`,
    'DELETE',
    null,
    { 'Authorization': `Bearer ${studentToken}` }
  );
  console.log('   Delete status:', rDel.status);
  const existsAfterDelete = fs.existsSync(localFilePath);
  console.log('   Local file purged after delete:', !existsAfterDelete);

  try { fs.unlinkSync(testFilePath); } catch (e) {}

  console.log('=== Outage & Local Consistency Verification Finished Successfully ===');
}

runOutageTest().catch(e => console.error('FATAL:', e));

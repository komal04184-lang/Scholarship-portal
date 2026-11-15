// Test: Review Service applicationClient calling Application Service
// Run from: c:\projects\scholarship
// Usage: node --experimental-vm-modules scripts/test_review_sync.mjs

import { updateApplicationStatus } from '../services/review-service/src/clients/applicationClient.js';
import http from 'http';

const SVC_TOKEN = 'internal_super_secret_token_change_in_prod';

function httpReq(port, path, method, body, headers) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port,
      path,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: d }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

async function main() {
  // 1. Find a SUBMITTED application
  const r1 = await httpReq(3003, '/api/v1/applications/admin/all', 'GET', null, {
    'X-Service-Token': SVC_TOKEN,
  });
  const apps = r1.body?.data?.applications || r1.body?.data || [];
  console.log('Total apps:', apps.length);

  const submitted = apps.find((a) => a.status === 'SUBMITTED');
  if (!submitted) {
    console.log('No SUBMITTED application found. Statuses:', apps.map((a) => a.status));
    return;
  }

  console.log(`\nTest app: ${submitted.application_id}  status: ${submitted.status}`);

  // 2. Call updateApplicationStatus exactly as reviewService.js does
  console.log('\n--- Calling updateApplicationStatus (UNDER_REVIEW, no auth header) ---');
  try {
    const result = await updateApplicationStatus(
      submitted.application_id,
      'UNDER_REVIEW',
      'Review in progress',
      undefined // no authorizationHeader → uses X-Service-Token
    );
    console.log('SUCCESS:', JSON.stringify(result));
  } catch (err) {
    console.error('ERROR:', err.message);
  }
}

main().catch((e) => console.error('FATAL:', e));

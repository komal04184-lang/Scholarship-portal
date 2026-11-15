const http = require('http');

function req(port, path, method, body, headers) {
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
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, body: d });
        }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

const SVC_TOKEN = 'internal_super_secret_token_change_in_prod';
const SVC_HDR = { 'X-Service-Token': SVC_TOKEN };

async function main() {
  // 1. Get all applications
  const r1 = await req(3003, '/api/v1/applications/admin/all', 'GET', null, SVC_HDR);
  const apps = r1.body.data?.applications || r1.body.data || [];
  console.log('Total apps:', apps.length);

  if (!apps.length) {
    console.log('No applications found — cannot test status patch');
    return;
  }

  // Find a SUBMITTED app
  const app = apps.find((a) => a.status === 'SUBMITTED') || apps[0];
  console.log(`\nTest app: ${app.application_id}  current status: ${app.status}`);

  // 2. Attempt UNDER_REVIEW transition via service token
  console.log('\n--- Testing SUBMITTED → UNDER_REVIEW via X-Service-Token ---');
  const r2 = await req(
    3003,
    `/api/v1/applications/${app.application_id}/status`,
    'PATCH',
    { status: 'UNDER_REVIEW', comment: 'Review in progress' },
    SVC_HDR
  );
  console.log('HTTP', r2.status, JSON.stringify(r2.body));

  // 3. If that worked, test UNDER_REVIEW → APPROVED
  if (r2.status === 200) {
    console.log('\n--- Testing UNDER_REVIEW → APPROVED via X-Service-Token ---');
    const r3 = await req(
      3003,
      `/api/v1/applications/${app.application_id}/status`,
      'PATCH',
      { status: 'APPROVED', comment: 'Scholarship approved' },
      SVC_HDR
    );
    console.log('HTTP', r3.status, JSON.stringify(r3.body));
  }
}

main().catch((e) => console.error('FATAL:', e.message));

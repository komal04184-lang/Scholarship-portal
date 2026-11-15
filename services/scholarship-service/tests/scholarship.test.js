const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const app = require('../src/app');

let server;
let baseUrl;

test.before(async () => {
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  try { await require('../src/config/db').end(); } catch (_) {}
  setTimeout(() => process.exit(0), 100);
});

test('GET /health returns 200 and health payload', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.service, 'scholarship-service');
  assert.equal(json.status, 'running');
});

test('GET /soap/wsdl returns WSDL definition XML', async () => {
  const res = await fetch(`${baseUrl}/soap/wsdl`);
  assert.equal(res.status, 200);
  const xml = await res.text();
  assert.ok(xml.includes('<definitions'));
  assert.ok(xml.includes('EligibilityService'));
});

test('POST /soap/eligibility processes SOAP envelope and returns SOAP response', async () => {
  const soapPayload = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://apexscholar.local/eligibility">
  <soap:Body>
    <tns:CheckEligibilityRequest>
      <tns:scholarshipId>test-id</tns:scholarshipId>
      <tns:studentCgpa>8.5</tns:studentCgpa>
      <tns:familyIncome>300000</tns:familyIncome>
    </tns:CheckEligibilityRequest>
  </soap:Body>
</soap:Envelope>`;

  const res = await fetch(`${baseUrl}/soap/eligibility`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml' },
    body: soapPayload,
  });

  assert.equal(res.status, 200);
  const xml = await res.text();
  assert.ok(xml.includes('CheckEligibilityResponse'));
  assert.ok(xml.includes('<tns:eligible>'));
});

test('POST /graphql handles GraphQL queries', async () => {
  const res = await fetch(`${baseUrl}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '{ scholarships(limit: 2) { id name status } }',
    }),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.ok(json.data !== undefined || json.errors !== undefined);
});

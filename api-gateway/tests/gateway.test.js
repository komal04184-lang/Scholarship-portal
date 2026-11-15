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
});

test('GET /health returns 200 with service information and microservice routes', async () => {
  const res = await fetch(`${baseUrl}/health`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.service, 'api-gateway');
  assert.ok(json.services.identity);
  assert.ok(json.services.scholarship);
  assert.ok(json.services.application);
  assert.ok(json.services.review);
});

test('X-Correlation-ID is generated and returned on all responses', async () => {
  const res = await fetch(`${baseUrl}/health`);
  const correlationId = res.headers.get('x-correlation-id');
  assert.ok(correlationId);
  assert.ok(correlationId.length > 10);
});

test('Rate limiting headers are returned on requests', async () => {
  const res = await fetch(`${baseUrl}/health`);
  // Health route skips limiter by design, let's probe a regular route
  const resApi = await fetch(`${baseUrl}/api/v1/unknown-route`);
  assert.equal(resApi.status, 404);
  const limit = resApi.headers.get('x-ratelimit-limit');
  const remaining = resApi.headers.get('x-ratelimit-remaining');
  assert.ok(limit !== null, 'X-RateLimit-Limit header present');
  assert.ok(remaining !== null, 'X-RateLimit-Remaining header present');
});

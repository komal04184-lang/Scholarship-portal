/**
 * Comprehensive Test Suite for Identity Student Service (identity_db)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const assert = require('assert');
const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/db/db');

let server;
let baseUrl;

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {
          json = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function run() {
  console.log('\n======================================================');
  console.log(' RUNNING IDENTITY STUDENT SERVICE TEST SUITE');
  console.log('======================================================\n');

  // Start temporary server for testing
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  baseUrl = `http://localhost:${port}`;

  let studentToken = null;
  let studentRefreshToken = null;
  let studentId = null;
  let adminToken = null;

  try {
    // 1. Health Endpoint
    await test('Health check returns status healthy', async () => {
      const res = await makeRequest('GET', '/api/v1/health');
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.service, 'identity-student-service');
      assert.strictEqual(res.data.database.name, 'identity_db');
    });

    // 2. Student Registration
    const testEmail = `test_student_${Date.now()}@test.com`;
    const testUsername = `student_${Date.now()}`;

    await test('Register new student successfully', async () => {
      const res = await makeRequest('POST', '/api/v1/auth/register', {
        username: testUsername,
        email: testEmail,
        password: 'Password@123',
        phone: '+91 9999888877',
        date_of_birth: '2003-01-01',
        gender: 'Female',
        address: '45 Tech Boulevard',
        city: 'Bengaluru',
        state: 'Karnataka',
        category: 'OBC',
        family_income: 350000,
        family_size: 4,
        academic_details: {
          institution_name: 'IIT Bangalore',
          course: 'B.Tech',
          branch: 'Information Technology',
          semester: 4,
          cgpa: 9.1,
          passing_year: 2026,
        },
      });

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(res.data.status, 'success');
      assert.ok(res.data.token, 'Should return access token');
      assert.strictEqual(res.data.user.email, testEmail);
      assert.strictEqual(res.data.user.role, 'student');
      studentId = res.data.user.id;
    });

    // 3. Duplicate Email Prevention
    await test('Prevent duplicate email registration (HTTP 409)', async () => {
      const res = await makeRequest('POST', '/api/v1/auth/register', {
        username: `diff_${Date.now()}`,
        email: testEmail,
        password: 'Password@123',
      });
      assert.strictEqual(res.statusCode, 409);
    });

    // 4. Student Login with correct credentials
    await test('Student login returns JWT and user profile', async () => {
      const res = await makeRequest('POST', '/api/v1/auth/login', {
        email: testEmail,
        password: 'Password@123',
      });

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.status, 'success');
      assert.ok(res.data.token, 'Should return JWT token');
      assert.ok(res.data.refreshToken, 'Should return refresh token');
      studentToken = res.data.token;
      studentRefreshToken = res.data.refreshToken;
    });

    // 5. Login with incorrect password (HTTP 401)
    await test('Login with incorrect password rejected (HTTP 401)', async () => {
      const res = await makeRequest('POST', '/api/v1/auth/login', {
        email: testEmail,
        password: 'WrongPassword!',
      });
      assert.strictEqual(res.statusCode, 401);
    });

    // 6. Access protected route with Bearer Token
    await test('Access /api/v1/auth/me with Bearer Token', async () => {
      const res = await makeRequest('GET', '/api/v1/auth/me', null, {
        Authorization: `Bearer ${studentToken}`,
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.user.id, studentId);
      assert.strictEqual(res.data.user.email, testEmail);
    });

    // 7. Get own student profile
    await test('Get own student profile (/api/v1/profile/me)', async () => {
      const res = await makeRequest('GET', '/api/v1/profile/me', null, {
        Authorization: `Bearer ${studentToken}`,
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.user.email, testEmail);
      assert.strictEqual(res.data.user.city, 'Bengaluru');
      assert.strictEqual(res.data.user.academic_details.course, 'B.Tech');
    });

    // 8. Update student profile
    await test('Update own student profile (/api/v1/profile/me)', async () => {
      const res = await makeRequest(
        'PUT',
        '/api/v1/profile/me',
        {
          phone: '+91 9123456780',
          city: 'Mysuru',
          academic_details: {
            semester: 5,
            cgpa: 9.3,
          },
        },
        {
          Authorization: `Bearer ${studentToken}`,
        }
      );
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.user.phone, '+91 9123456780');
      assert.strictEqual(res.data.user.city, 'Mysuru');
      assert.strictEqual(res.data.user.academic_details.semester, 5);
      assert.strictEqual(res.data.user.academic_details.cgpa, 9.3);
    });

    // 9. Token Refresh
    await test('Refresh access token (/api/v1/auth/refresh)', async () => {
      const res = await makeRequest('POST', '/api/v1/auth/refresh', {
        refreshToken: studentRefreshToken,
      });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.data.token, 'Should issue new access token');
      studentToken = res.data.token;
    });

    // 10. Admin Login (seeded default admin)
    await test('Admin login (admin@scholarship.gov.in / Admin@123)', async () => {
      const res = await makeRequest('POST', '/api/v1/auth/login', {
        email: 'admin@scholarship.gov.in',
        password: 'Admin@123',
      });
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.user.role, 'admin');
      adminToken = res.data.token;
    });

    // 11. Admin Dashboard Stats
    await test('Admin access dashboard stats (/api/v1/admin/dashboard)', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/dashboard', null, {
        Authorization: `Bearer ${adminToken}`,
      });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.data.stats.total_students >= 1);
    });

    // 12. Student denied access to Admin Dashboard (HTTP 403)
    await test('Student forbidden from accessing Admin Dashboard (HTTP 403)', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/dashboard', null, {
        Authorization: `Bearer ${studentToken}`,
      });
      assert.strictEqual(res.statusCode, 403);
    });

    // 13. Admin List Users
    await test('Admin list users with pagination (/api/v1/admin/users)', async () => {
      const res = await makeRequest('GET', '/api/v1/admin/users?page=1&limit=10', null, {
        Authorization: `Bearer ${adminToken}`,
      });
      assert.strictEqual(res.statusCode, 200);
      assert.ok(Array.isArray(res.data.data));
      assert.ok(res.data.pagination.total >= 1);
    });

    // 14. Student forbidden from viewing other student profile (HTTP 403)
    await test('Student forbidden from viewing other student profile (HTTP 403)', async () => {
      const fakeOtherId = '00000000-0000-0000-0000-000000000000';
      const res = await makeRequest('GET', `/api/v1/profile/${fakeOtherId}`, null, {
        Authorization: `Bearer ${studentToken}`,
      });
      assert.strictEqual(res.statusCode, 403);
    });

    // 15. Student Basic Info public endpoint
    await test('Get student basic info (/api/v1/students/:id/basic-info)', async () => {
      const res = await makeRequest('GET', `/api/v1/students/${studentId}/basic-info`);
      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.data.data.id, studentId);
      assert.strictEqual(res.data.data.email, testEmail);
    });

    // 16. Logout
    await test('Logout user successfully', async () => {
      const res = await makeRequest(
        'POST',
        '/api/v1/auth/logout',
        { refreshToken: studentRefreshToken },
        { Authorization: `Bearer ${studentToken}` }
      );
      assert.strictEqual(res.statusCode, 200);
    });

  } finally {
    server.close();
    await pool.end();
  }

  console.log('\n======================================================');
  console.log(` TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test suite runner crashed:', err);
  process.exit(1);
});


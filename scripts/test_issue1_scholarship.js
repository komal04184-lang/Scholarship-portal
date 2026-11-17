/**
 * Test Issue 1: Admin can create and publish scholarships with full validation and persistence.
 */
const http = require('http');

function postRequest(url, data, token = null) {
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
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function getRequest(url, token = null) {
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
    req.end();
  });
}

async function run() {
  console.log('=== TEST ISSUE 1: Admin Scholarship Creation ===');

  // 1. Admin Login
  console.log('1. Logging in as admin...');
  const loginRes = await postRequest('http://localhost:3000/api/v1/auth/login', {
    email: 'admin@scholarship.gov.in',
    password: 'Admin@123',
  });

  if (loginRes.status !== 200 || !loginRes.data.token) {
    console.error('Admin login failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.data.token;
  console.log('Admin login successful.');

  // 2. Create Scholarship with required fields
  console.log('2. Creating scholarship with required criteria...');
  const payload = {
    title: 'Merit Excellence in Engineering & Technology 2026',
    description: 'Prestigious national scholarship supporting top performing undergraduate engineering students with proven academic excellence.',
    category: 'Merit',
    department: 'Engineering & Technology',
    amount: 80000,
    total_slots: 20,
    seats: 20,
    min_cgpa: 8.0,
    min_gpa: 8.0,
    max_income: 1200000,
    deadline: '2026-12-31',
    required_documents: ['Income Certificate', 'Academic Marksheet', 'College Identity Card'],
    status: 'ACTIVE',
  };

  const createRes = await postRequest('http://localhost:3000/api/v1/scholarships', payload, token);
  console.log('Create Response Status:', createRes.status);
  console.log('Create Response Data:', JSON.stringify(createRes.data, null, 2));

  if (createRes.status !== 201 && createRes.status !== 200) {
    console.error('FAIL: Could not create scholarship:', createRes.data);
    process.exit(1);
  }

  const createdSch = createRes.data?.data?.scholarship || createRes.data?.scholarship || createRes.data?.data;
  console.log('Created Scholarship ID:', createdSch?.scholarship_id || createdSch?.id);

  // 3. Verify in public catalog
  console.log('3. Fetching public catalog to verify persistence...');
  const catRes = await getRequest('http://localhost:3000/api/v1/scholarships');
  console.log('Catalog Response Status:', catRes.status);
  const scholarships = catRes.data?.items || catRes.data?.data?.scholarships || catRes.data?.scholarships || (Array.isArray(catRes.data?.data) ? catRes.data.data : []);
  const found = scholarships.find((s) => (s.scholarship_id || s.id) === (createdSch?.scholarship_id || createdSch?.id));

  if (!found) {
    console.error('FAIL: Newly created scholarship not found in catalog listing!');
    process.exit(1);
  }

  console.log('Found in Catalog:', {
    id: found.scholarship_id || found.id,
    title: found.title || found.name,
    category: found.category,
    department: found.department,
    amount: found.amount,
    total_slots: found.total_slots || found.seats,
    min_cgpa: found.min_cgpa || found.min_gpa,
    deadline: found.deadline,
  });

  console.log('SUCCESS: Issue 1 fully verified!');
}

run().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(1);
});

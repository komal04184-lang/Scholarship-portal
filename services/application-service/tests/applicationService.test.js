const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const app = require('../src/app');
const config = require('../src/config');
const { pool } = require('../src/config/database');
const { connectMongo, closeMongo } = require('../src/config/mongodb');

// ─── Token Helpers ───────────────────────────────────────────────────────────
const createToken = (payload) =>
  jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });

// Students 1 and 2 exist in the seeded database
const student1Token = createToken({ id: 1, email: 'student@demo.com', role: 'STUDENT' });
const student2Token = createToken({ id: 2, email: 'priya@demo.com',   role: 'STUDENT' });
const adminToken    = createToken({ id: 100, email: 'admin@portal.com',  role: 'ADMIN' });
const reviewerToken = createToken({ id: 1,   email: 'reviewer@portal.com', role: 'REVIEWER' });

// ─── Shared State ────────────────────────────────────────────────────────────
let testScholarshipId = null;   // Created in beforeAll, deleted in afterAll
let createdAppId      = null;   // Created in submission test
let testDocumentId    = null;   // Returned after document upload

const dummyFilePath = path.join(__dirname, 'test_sample.pdf');

// ─── Setup / Teardown ────────────────────────────────────────────────────────
beforeAll(async () => {
  // Create a minimal PDF for upload tests
  fs.writeFileSync(
    dummyFilePath,
    '%PDF-1.4 1 0 obj<</Type/Catalog>>endobj\n%%EOF',
  );

  // Connect MongoDB (graceful – service starts without it)
  await connectMongo();

  // Insert a fresh test scholarship so FK constraints are satisfied.
  // Uses far-future deadline so deadline checks always pass.
  const sch = await pool.query(
    `INSERT INTO scholarship (name, description, amount, status, deadline)
     VALUES ('AppSvc Test Scholarship', 'Automated test record', 50000, 'ACTIVE', '2029-12-31')
     RETURNING scholarship_id`,
  );
  testScholarshipId = Number(sch.rows[0].scholarship_id);
  console.log(`[setup] Created test scholarship ID: ${testScholarshipId}`);
});

afterAll(async () => {
  // Clean up: documents → applications → scholarship  (honour FK order)
  if (createdAppId) {
    await pool.query('DELETE FROM application_document WHERE application_id = $1', [createdAppId]).catch(() => {});
    await pool.query('DELETE FROM application_status   WHERE application_id = $1', [createdAppId]).catch(() => {});
    await pool.query('DELETE FROM application           WHERE application_id = $1', [createdAppId]).catch(() => {});
  }
  if (testScholarshipId) {
    await pool.query('DELETE FROM scholarship WHERE scholarship_id = $1', [testScholarshipId]).catch(() => {});
  }

  // Remove dummy test file
  if (fs.existsSync(dummyFilePath)) fs.unlinkSync(dummyFilePath);

  await pool.end();
  await closeMongo();
});

// ─────────────────────────────────────────────────────────────────────────────
//  1. HEALTH ENDPOINT
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('should return 200 with healthy status and dependency map', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('application-service');
    expect(res.body.dependencies.postgres.connected).toBe(true);
  });

  it('should also respond on /api/v1/applications/health', async () => {
    const res = await request(app).get('/api/v1/applications/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  2. AUTHENTICATION & AUTHORIZATION GUARDS
// ─────────────────────────────────────────────────────────────────────────────
describe('Authentication & Authorization Guards', () => {
  it('should return 401 when no token is provided', async () => {
    const res = await request(app).get('/api/v1/applications');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 401 for a corrupted token', async () => {
    const res = await request(app)
      .get('/api/v1/applications')
      .set('Authorization', 'Bearer bad.token.here');
    expect(res.status).toBe(401);
  });

  it('should return 403 when non-STUDENT tries to submit an application', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ scholarship_id: testScholarshipId, statement: 'Admin applying' });
    expect(res.status).toBe(403);
  });

  it('should return 403 when STUDENT accesses the admin/all route', async () => {
    const res = await request(app)
      .get('/api/v1/applications/admin/all')
      .set('Authorization', `Bearer ${student1Token}`);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  3. APPLICATION SUBMISSION & VALIDATION
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/v1/applications – Application Submission', () => {
  it('should return 400 when scholarship_id is missing', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ statement: 'No scholarship id here' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('should return 400 when both statement and sop are absent', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ scholarship_id: testScholarshipId });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should submit an application and return 201 with SUBMITTED status', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({
        scholarship_id: testScholarshipId,
        statement: 'I am applying to advance my research in distributed systems.',
        annual_income: 300000,
        cgpa: 8.8,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.application.status).toBe('SUBMITTED');
    expect(String(res.body.application.student_id)).toBe('1');
    expect(String(res.body.application.scholarship_id)).toBe(String(testScholarshipId));

    createdAppId = res.body.application.application_id;
    console.log(`[test] Created application ID: ${createdAppId}`);
  });

  it('should return 409 Conflict on duplicate submission', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ scholarship_id: testScholarshipId, statement: 'Duplicate attempt' });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already applied/i);
    expect(res.body).toHaveProperty('existing_application_id');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  4. MY APPLICATIONS (STUDENT RETRIEVAL)
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/applications – My Applications', () => {
  it('should include the new application in student1\'s list', async () => {
    const res = await request(app)
      .get('/api/v1/applications')
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.applications)).toBe(true);
    const found = res.body.applications.some(
      (a) => String(a.application_id) === String(createdAppId),
    );
    expect(found).toBe(true);
  });

  it('should NOT include student1\'s application in student2\'s list', async () => {
    const res = await request(app)
      .get('/api/v1/applications')
      .set('Authorization', `Bearer ${student2Token}`);

    expect(res.status).toBe(200);
    const found = res.body.applications.some(
      (a) => String(a.application_id) === String(createdAppId),
    );
    expect(found).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  5. APPLICATION DETAILS & ACCESS CONTROL
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/applications/:id – Application Details', () => {
  it('should return 403 when student2 accesses student1\'s application', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${createdAppId}`)
      .set('Authorization', `Bearer ${student2Token}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/Access denied/i);
  });

  it('should return full details to the owner (student1)', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${createdAppId}`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(String(res.body.application.application_id)).toBe(String(createdAppId));
    expect(Array.isArray(res.body.statusHistory)).toBe(true);
    expect(res.body.statusHistory.length).toBeGreaterThanOrEqual(1);
    expect(res.body.statusHistory[0].status).toBe('SUBMITTED');
  });

  it('should return full details to ADMIN', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${createdAppId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(String(res.body.application.application_id)).toBe(String(createdAppId));
  });

  it('should return 404 for a non-existent application ID', async () => {
    const res = await request(app)
      .get('/api/v1/applications/999999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  6. APPLICATION TRACKING & HISTORY
// ─────────────────────────────────────────────────────────────────────────────
describe('Application Tracking & Status History', () => {
  it('GET /:id/track should return progress % and timeline', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${createdAppId}/track`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.tracking.current_status).toBe('SUBMITTED');
    expect(res.body.tracking.progress_percentage).toBe(25);
    expect(typeof res.body.tracking.next_step).toBe('string');
    expect(Array.isArray(res.body.tracking.timeline)).toBe(true);
  });

  it('GET /:id/history should return status history array', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${createdAppId}/history`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.history)).toBe(true);
    expect(res.body.history.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  7. APPLICATION UPDATES (STUDENT)
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/v1/applications/:id – Update Application', () => {
  it('should allow student1 to update the statement in SUBMITTED status', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${createdAppId}`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ statement: 'Updated SOP with more details about my project.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.application.statement).toBe('Updated SOP with more details about my project.');
  });

  it('should return 403 when student2 tries to modify student1\'s application', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${createdAppId}`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ statement: 'Tamper attempt by student2' });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  8. STATUS TRANSITIONS (ADMIN / REVIEWER)
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/v1/applications/:id/status – Status Transitions', () => {
  it('should return 403 when STUDENT tries to change status', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${createdAppId}/status`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ status: 'APPROVED' });
    expect(res.status).toBe(403);
  });

  it('should return 400 on invalid transition SUBMITTED → DISBURSED', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${createdAppId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DISBURSED', comment: 'Skip steps' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid status transition/i);
  });

  it('should allow REVIEWER to transition SUBMITTED → UNDER_REVIEW', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${createdAppId}/status`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({ status: 'UNDER_REVIEW', comment: 'Documents in order. Moving to scrutiny.' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.newStatus).toBe('UNDER_REVIEW');
  });

  it('should allow ADMIN to transition UNDER_REVIEW → APPROVED', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${createdAppId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'APPROVED', comment: 'Scholarship grant approved by committee.' });

    expect(res.status).toBe(200);
    expect(res.body.newStatus).toBe('APPROVED');
  });

  it('should reflect APPROVED status in tracking after final transition', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${createdAppId}/track`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.tracking.current_status).toBe('APPROVED');
    expect(res.body.tracking.progress_percentage).toBe(90);
    expect(res.body.tracking.timeline.length).toBeGreaterThanOrEqual(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  9. DOCUMENT UPLOAD, DOWNLOAD & VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
describe('Document Upload & Management', () => {
  it('should upload a document and return 201 with PENDING verification', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${createdAppId}/documents`)
      .set('Authorization', `Bearer ${student1Token}`)
      .field('requirement_id', 1)
      .field('document_name', 'Income_Certificate.pdf')
      .attach('document', dummyFilePath);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.document.original_name).toBe('test_sample.pdf');
    expect(res.body.document.verification_status).toBe('PENDING');

    testDocumentId =
      res.body.document.application_document_id ?? res.body.document.document_id;
  });

  it('should return 400 when no file is attached', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${createdAppId}/documents`)
      .set('Authorization', `Bearer ${student1Token}`)
      .field('requirement_id', 1);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No file uploaded/i);
  });

  it('should list uploaded documents for the application', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${createdAppId}/documents`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.documents)).toBe(true);
    expect(res.body.documents.length).toBeGreaterThanOrEqual(1);
  });

  it('should let student1 download the uploaded document (200 + PDF content-type)', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${createdAppId}/documents/${testDocumentId}/download`)
      .set('Authorization', `Bearer ${student1Token}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/i);
  });

  it('should block student2 from downloading student1\'s document (403)', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${createdAppId}/documents/${testDocumentId}/download`)
      .set('Authorization', `Bearer ${student2Token}`);
    expect(res.status).toBe(403);
  });

  it('should let REVIEWER verify the document (VERIFIED)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${createdAppId}/documents/${testDocumentId}/verify`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        verification_status: 'VERIFIED',
        reviewer_comment: 'Income certificate verified against official records.',
      });

    expect(res.status).toBe(200);
    expect(res.body.document.verification_status).toBe('VERIFIED');
  });

  it('should block STUDENT from verifying a document (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${createdAppId}/documents/${testDocumentId}/verify`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ verification_status: 'VERIFIED' });
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. ADMIN APPLICATIONS LIST
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/v1/applications/admin/all – Admin Listing', () => {
  it('should return paginated list with total count for ADMIN', async () => {
    const res = await request(app)
      .get('/api/v1/applications/admin/all?limit=10&offset=0')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.total).toBe('number');
    expect(Array.isArray(res.body.applications)).toBe(true);
  });

  it('should filter applications by status', async () => {
    const res = await request(app)
      .get('/api/v1/applications/admin/all?status=APPROVED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.applications.every((a) => a.status === 'APPROVED')).toBe(true);
  });

  it('should return results for REVIEWER as well', async () => {
    const res = await request(app)
      .get('/api/v1/applications/admin/all')
      .set('Authorization', `Bearer ${reviewerToken}`);
    expect(res.status).toBe(200);
  });
});

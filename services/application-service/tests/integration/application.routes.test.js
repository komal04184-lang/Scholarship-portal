const request = require('supertest');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = require('../../src/app');
const env = require('../../src/config/env');
const { pool, connectMongo, closeConnections } = require('../../src/config/database');

const JWT_SECRET = env.jwt.secret;

// Helper: generate tokens with existing seeded student and reviewer IDs
function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const student1Token = makeToken({ id: 1, email: 'student@demo.com', role: 'student' });
const student2Token = makeToken({ id: 2, email: 'priya@demo.com', role: 'student' });
const reviewerToken = makeToken({ id: 1, email: 'reviewer@portal.com', role: 'reviewer' });
const adminToken = makeToken({ id: 1, email: 'admin@portal.com', role: 'admin' });

let testScholarshipId = null;
let createdAppId = null;
let createdDocId = null;

beforeAll(async () => {
  await connectMongo();
  // Create an active test scholarship in DB
  const res = await pool.query(`
    INSERT INTO scholarship (name, description, amount, status, deadline)
    VALUES ('Integration Test Scholarship', 'Automated Test Program', 75000.00, 'ACTIVE', NOW() + INTERVAL '30 days')
    RETURNING scholarship_id;
  `);
  testScholarshipId = res.rows[0].scholarship_id;
});

afterAll(async () => {
  if (testScholarshipId) {
    try {
      await pool.query('DELETE FROM application_document WHERE application_id IN (SELECT application_id FROM application WHERE scholarship_id = $1)', [testScholarshipId]);
      await pool.query('DELETE FROM application_status WHERE application_id IN (SELECT application_id FROM application WHERE scholarship_id = $1)', [testScholarshipId]);
      await pool.query('DELETE FROM application WHERE scholarship_id = $1', [testScholarshipId]);
      await pool.query('DELETE FROM scholarship WHERE scholarship_id = $1', [testScholarshipId]);
    } catch (e) {}
  }
  await closeConnections();
});

describe('Application Microservice API Integration Tests', () => {
  // 1. Health
  describe('GET /health', () => {
    it('should return 200 with healthy status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('application-service');
      expect(res.body.dependencies.postgres.connected).toBe(true);
    });
  });

  // 2. Auth & Role Guards
  describe('Authentication & Authorization Guards', () => {
    it('should return 401 when no token is provided', async () => {
      const res = await request(app).get('/api/v1/applications/my');
      expect(res.status).toBe(401);
    });

    it('should return 401 when token is invalid', async () => {
      const res = await request(app)
        .get('/api/v1/applications/my')
        .set('Authorization', 'Bearer bad.token.here');
      expect(res.status).toBe(401);
    });

    it('should return 403 when non-student tries to submit an application', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ scholarship_id: testScholarshipId, statement: 'Admin attempting submission' });
      expect(res.status).toBe(403);
    });

    it('should return 403 when student accesses admin-only route', async () => {
      const res = await request(app)
        .get('/api/v1/applications/admin/all')
        .set('Authorization', `Bearer ${student1Token}`);
      expect(res.status).toBe(403);
    });
  });

  // 3. Application Submission & Idempotency
  describe('POST /api/v1/applications', () => {
    it('should return 400 when scholarship_id is missing', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ statement: 'Valid statement length here' });
      expect(res.status).toBe(400);
    });

    it('should submit application and return 201 with SUBMITTED status', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          scholarship_id: testScholarshipId,
          statement: 'I am applying for this integration scholarship opportunity.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const appData = res.body.data?.application || res.body.application;
      expect(appData.status).toBe('SUBMITTED');
      expect(appData.application_number).toBeDefined();
      createdAppId = appData.application_id;
    });

    it('should return 409 Conflict on duplicate submission for same scholarship', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${student1Token}`)
        .send({
          scholarship_id: testScholarshipId,
          statement: 'Second attempt should fail duplicate guard.',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });
  });

  // 4. Student Applications ("My Applications")
  describe('GET /api/v1/applications/my', () => {
    it('should list student1 applications', async () => {
      const res = await request(app)
        .get('/api/v1/applications/my')
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      const apps = res.body.data?.applications || res.body.applications;
      expect(apps.length).toBeGreaterThan(0);
      expect(apps.some((a) => String(a.application_id) === String(createdAppId))).toBe(true);
    });

    it('should NOT list student1 applications for student2', async () => {
      const res = await request(app)
        .get('/api/v1/applications/my')
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(200);
      const apps = res.body.data?.applications || res.body.applications;
      expect(apps.some((a) => String(a.application_id) === String(createdAppId))).toBe(false);
    });
  });

  // 5. Details & Access Control
  describe('GET /api/v1/applications/:id', () => {
    it('should return 403 when student2 tries to access student1 application', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${student2Token}`);

      expect(res.status).toBe(403);
    });

    it('should return 200 with full details for application owner', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.application).toBeDefined();
      expect(data.statusHistory).toBeDefined();
    });

    it('should return 200 for Admin viewing any application', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });
  });

  // 6. Tracking
  describe('GET /api/v1/applications/:id/track', () => {
    it('should return progress percentage and milestone timeline', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${createdAppId}/track`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      const tracking = res.body.data?.tracking || res.body.tracking;
      expect(tracking.progress_percentage).toBe(25);
      expect(tracking.timeline).toHaveLength(1);
    });
  });

  // 7. Update Application
  describe('PATCH /api/v1/applications/:id', () => {
    it('should allow student owner to update statement', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ statement: 'Updated statement with additional academic merits.' });

      expect(res.status).toBe(200);
      const appObj = res.body.data?.application || res.body.application;
      expect(appObj.statement).toContain('Updated statement');
    });

    it('should block non-owner student from updating application', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${createdAppId}`)
        .set('Authorization', `Bearer ${student2Token}`)
        .send({ statement: 'Unauthorized update attempt' });

      expect(res.status).toBe(403);
    });
  });

  // 8. Documents Upload & Verification
  describe('Document Attachment Endpoints', () => {
    it('should upload document for application', async () => {
      const testFilePath = path.join(__dirname, 'test_sample.pdf');
      fs.writeFileSync(testFilePath, '%PDF-1.4 test document content');

      const res = await request(app)
        .post(`/api/v1/applications/${createdAppId}/documents`)
        .set('Authorization', `Bearer ${student1Token}`)
        .attach('document', testFilePath)
        .field('requirement_id', 1)
        .field('document_name', 'Semester Marksheet');

      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);

      expect(res.status).toBe(201);
      const doc = res.body.data?.document || res.body.document;
      expect(doc.verification_status).toBe('PENDING');
      createdDocId = doc.application_document_id;
    });

    it('should list attached documents', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${createdAppId}/documents`)
        .set('Authorization', `Bearer ${student1Token}`);

      expect(res.status).toBe(200);
      const docs = res.body.data?.documents || res.body.documents;
      expect(docs.length).toBeGreaterThan(0);
    });

    it('should allow Reviewer to verify document', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${createdAppId}/documents/${createdDocId}/verify`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({
          verification_status: 'VERIFIED',
          comment: 'Document verified and approved.',
        });

      expect(res.status).toBe(200);
      const doc = res.body.data?.document || res.body.document;
      expect(doc.verification_status).toBe('VERIFIED');
    });
  });

  // 9. Status Transitions
  describe('PATCH /api/v1/applications/:id/status', () => {
    it('should block student from updating status', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${createdAppId}/status`)
        .set('Authorization', `Bearer ${student1Token}`)
        .send({ status: 'APPROVED' });

      expect(res.status).toBe(403);
    });

    it('should reject invalid transition SUBMITTED -> DISBURSED', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${createdAppId}/status`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ status: 'DISBURSED' });

      expect(res.status).toBe(400);
    });

    it('should allow Reviewer to advance SUBMITTED -> UNDER_REVIEW', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${createdAppId}/status`)
        .set('Authorization', `Bearer ${reviewerToken}`)
        .send({ status: 'UNDER_REVIEW', comment: 'Review underway' });

      expect(res.status).toBe(200);
    });

    it('should allow Admin to advance UNDER_REVIEW -> APPROVED', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${createdAppId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'APPROVED', comment: 'Approved for scholarship' });

      expect(res.status).toBe(200);
    });
  });

  // 10. Internal Service Communication
  describe('Internal Service Endpoints', () => {
    it('should block internal request without service token', async () => {
      const res = await request(app)
        .get(`/internal/applications/${createdAppId}`);
      expect(res.status).toBe(401);
    });

    it('should allow authorized service with valid X-Service-Token', async () => {
      const res = await request(app)
        .get(`/internal/applications/${createdAppId}`)
        .set('X-Service-Token', env.services.serviceToServiceSecret);

      expect(res.status).toBe(200);
      const data = res.body.data || res.body;
      expect(data.application).toBeDefined();
    });
  });
});

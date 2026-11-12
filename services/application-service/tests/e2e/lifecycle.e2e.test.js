const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const env = require('../../src/config/env');
const { pool, connectMongo, closeConnections } = require('../../src/config/database');

const makeToken = (payload) => jwt.sign(payload, env.jwt.secret, { expiresIn: '1h' });

const studentToken = makeToken({ id: 1, email: 'student@demo.com', role: 'student' });
const reviewerToken = makeToken({ id: 1, email: 'reviewer@portal.com', role: 'reviewer' });
const adminToken = makeToken({ id: 1, email: 'admin@portal.com', role: 'admin' });

let e2eScholarshipId = null;
let e2eAppId = null;

beforeAll(async () => {
  await connectMongo();
  const res = await pool.query(`
    INSERT INTO scholarship (name, description, amount, status, deadline)
    VALUES ('E2E Lifecycle Scholarship', 'Full lifecycle test scholarship', 120000.00, 'ACTIVE', NOW() + INTERVAL '45 days')
    RETURNING scholarship_id;
  `);
  e2eScholarshipId = res.rows[0].scholarship_id;
});

afterAll(async () => {
  if (e2eScholarshipId) {
    try {
      await pool.query('DELETE FROM application_document WHERE application_id IN (SELECT application_id FROM application WHERE scholarship_id = $1)', [e2eScholarshipId]);
      await pool.query('DELETE FROM application_status WHERE application_id IN (SELECT application_id FROM application WHERE scholarship_id = $1)', [e2eScholarshipId]);
      await pool.query('DELETE FROM application WHERE scholarship_id = $1', [e2eScholarshipId]);
      await pool.query('DELETE FROM scholarship WHERE scholarship_id = $1', [e2eScholarshipId]);
    } catch (e) {}
  }
  await closeConnections();
});

describe('Full Application Lifecycle E2E Test', () => {
  it('Step 1: Student submits application', async () => {
    const res = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        scholarship_id: e2eScholarshipId,
        statement: 'Full lifecycle scholarship application submission test statement.',
      });

    expect(res.status).toBe(201);
    const appObj = res.body.data?.application || res.body.application;
    expect(appObj.status).toBe('SUBMITTED');
    e2eAppId = appObj.application_id;
  });

  it('Step 2: Reviewer moves application to UNDER_REVIEW', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${e2eAppId}/status`)
      .set('Authorization', `Bearer ${reviewerToken}`)
      .send({
        status: 'UNDER_REVIEW',
        comment: 'Reviewer accepted application for verification.',
      });

    expect(res.status).toBe(200);
  });

  it('Step 3: Admin approves the application', async () => {
    const res = await request(app)
      .patch(`/api/v1/applications/${e2eAppId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'APPROVED',
        comment: 'All verification checks passed. Approved.',
      });

    expect(res.status).toBe(200);
  });

  it('Step 4: Student tracking reflects APPROVED status with high progress', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${e2eAppId}/track`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    const tracking = res.body.data?.tracking || res.body.tracking;
    expect(tracking.current_status).toBe('APPROVED');
    expect(tracking.progress_percentage).toBe(90);
  });

  it('Step 5: Payment Service updates status to DISBURSED via internal route', async () => {
    const res = await request(app)
      .patch(`/internal/applications/${e2eAppId}/status`)
      .set('X-Service-Token', env.services.serviceToServiceSecret)
      .send({
        status: 'DISBURSED',
        remarks: 'Grant funds disbursed to bank account.',
        caller_service: 'payment-service',
      });

    expect(res.status).toBe(200);
  });

  it('Step 6: Student tracking reflects 100% completion after disbursement', async () => {
    const res = await request(app)
      .get(`/api/v1/applications/${e2eAppId}/track`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    const tracking = res.body.data?.tracking || res.body.tracking;
    expect(tracking.current_status).toBe('DISBURSED');
    expect(tracking.progress_percentage).toBe(100);
  });

  it('Step 7: Withdrawal is prohibited once application has been disbursed', async () => {
    const res = await request(app)
      .post(`/api/v1/applications/${e2eAppId}/withdraw`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ remarks: 'Cannot withdraw disbursed funds' });

    expect(res.status).toBe(400);
  });
});

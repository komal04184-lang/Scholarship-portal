
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import {
  create,
  verifyDocuments,
  updateEligibility,
  decide
} from '../src/services/reviewService.js';

import {
  getReview,
  getReviewHistory
} from '../src/models/reviewModel.js';

let callbackServer;
let callbackUrl;
let receivedCallback;

test('start mock Application Service callback endpoint', async () => {
  callbackServer = http.createServer(async (req, res) => {
    let body = '';

    for await (const chunk of req) {
      body += chunk;
    }

    receivedCallback = {
      method: req.method,
      url: req.url,
      authorization: req.headers.authorization,
      body: JSON.parse(body || '{}')
    };

    res.writeHead(200, {
      'content-type': 'application/json'
    });

    res.end(JSON.stringify({ success: true }));
  });

  await new Promise(resolve =>
    callbackServer.listen(0, '127.0.0.1', resolve)
  );

  callbackUrl =
    `http://127.0.0.1:${callbackServer.address().port}`;

  process.env.APPLICATION_SERVICE_URL = callbackUrl;
});

test('review workflow prevents approval before verification and syncs final decision', async () => {
  const review = await create({
    applicationId: 'TEST-APP-001',
    studentId: 'TEST-STU-001',
    scholarshipId: 'TEST-SCH-001',
    documents: [
      {
        documentId: 'DOC-1',
        name: 'Marks Card'
      }
    ]
  });

  await assert.rejects(
    () => decide(review.id, 'APPROVED'),
    /Cannot approve/
  );

  await verifyDocuments(
    review.id,
    [
      {
        documentId: 'DOC-1',
        name: 'Marks Card',
        status: 'VERIFIED'
      }
    ],
    'REVIEWER-1'
  );

  await updateEligibility(
    review.id,
    true,
    'Criteria met',
    'REVIEWER-1'
  );

  const approved = await decide(
    review.id,
    'APPROVED',
    'All checks passed',
    'REVIEWER-1',
    'Bearer test-reviewer-token'
  );

  assert.equal(approved.status, 'APPROVED');
  assert.equal(approved.callbackStatus, 'SYNCED');

  assert.equal(
    (await getReview(review.id)).decision,
    'APPROVED'
  );

  assert.equal(receivedCallback.method, 'PATCH');

  assert.equal(
    receivedCallback.url,
    '/api/v1/applications/TEST-APP-001/status'
  );

  assert.equal(
    receivedCallback.authorization,
    'Bearer test-reviewer-token'
  );

  assert.equal(receivedCallback.body.status, 'APPROVED');

  assert.equal(
    receivedCallback.body.comment,
    'All checks passed'
  );

  assert.equal(
    (await getReviewHistory(review.id)).length,
    3
  );
});

test('document updates preserve existing documents and reject edits after final decision', async () => {
  const review = await create({
    applicationId: 'TEST-APP-002',
    studentId: 'TEST-STU-002',
    scholarshipId: 'TEST-SCH-002',
    documents: [
      {
        documentId: 'DOC-A',
        name: 'Income Certificate'
      },
      {
        documentId: 'DOC-B',
        name: 'Marks Card'
      }
    ]
  });

  const updated = await verifyDocuments(
    review.id,
    [
      {
        documentId: 'DOC-A',
        name: 'Income Certificate',
        status: 'VERIFIED'
      }
    ],
    'REVIEWER-2'
  );

  assert.equal(updated.documents.length, 2);

  await updateEligibility(
    review.id,
    false,
    'Income criteria not met',
    'REVIEWER-2'
  );

  await decide(
    review.id,
    'REJECTED',
    'Not eligible',
    'REVIEWER-2',
    'Bearer test-reviewer-token'
  );

  await assert.rejects(
    () =>
      verifyDocuments(
        review.id,
        [
          {
            documentId: 'DOC-B',
            name: 'Marks Card',
            status: 'VERIFIED'
          }
        ],
        'REVIEWER-2'
      ),
    /finalized review/
  );
});

test('duplicate application review is rejected', async () => {
  await create({
    applicationId: 'TEST-APP-003',
    studentId: 'TEST-STU-003',
    scholarshipId: 'TEST-SCH-003'
  });

  await assert.rejects(
    () =>
      create({
        applicationId: 'TEST-APP-003',
        studentId: 'TEST-STU-003',
        scholarshipId: 'TEST-SCH-003'
      }),
    /already exists/
  );
});

test.after(async () => {
  if (callbackServer) {
    await new Promise(resolve =>
      callbackServer.close(resolve)
    );
  }
});

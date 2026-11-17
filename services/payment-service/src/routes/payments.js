const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// GET /api/v1/payments - Admin lists all disbursements; Student lists own disbursements
router.get('/', authenticateToken, async (req, res) => {
  try {
    const role = (req.user.role || '').toLowerCase();
    if (role === 'admin') {
      const { rows } = await pool.query('SELECT * FROM disbursements ORDER BY created_at DESC');
      return res.json({ disbursements: rows });
    }
    const { rows } = await pool.query(
      'SELECT * FROM disbursements WHERE student_id = $1 ORDER BY created_at DESC',
      [req.user.id || req.user.userId]
    );
    return res.json({ disbursements: rows });
  } catch (err) {
    console.error('[PaymentService] GET / error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch disbursements' });
  }
});

// GET /api/v1/payments/application/:applicationId - Check disbursement status for an application
router.get('/application/:applicationId', authenticateToken, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { rows } = await pool.query(
      'SELECT * FROM disbursements WHERE application_id = $1',
      [applicationId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'No disbursement record found for this application' });
    }
    const record = rows[0];
    const role = (req.user.role || '').toLowerCase();
    const userId = req.user.id || req.user.userId;
    if (role !== 'admin' && record.student_id !== userId) {
      return res.status(403).json({ error: 'Unauthorized to view this disbursement' });
    }
    return res.json({ disbursement: record });
  } catch (err) {
    console.error('[PaymentService] GET /application/:id error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch disbursement status' });
  }
});

// POST /api/v1/payments/disburse - Admin initiates scholarship disbursement
router.post('/disburse', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const { application_id, student_id, scholarship_id, amount, currency = 'INR', payment_method = 'NEFT/UPI', remarks = '' } = req.body;

  if (!application_id || !student_id || !scholarship_id || !amount) {
    return res.status(400).json({ error: 'application_id, student_id, scholarship_id, and amount are required' });
  }

  const transactionRef = `TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const adminId = req.user.id || req.user.userId;

  try {
    const { rows } = await pool.query(
      `INSERT INTO disbursements
        (application_id, student_id, scholarship_id, amount, currency, transaction_ref, payment_method, status, initiated_by, remarks, disbursed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'DISBURSED', $8, $9, NOW())
       RETURNING *`,
      [application_id, student_id, scholarship_id, amount, currency, transactionRef, payment_method, adminId, remarks]
    );

    // Optional callback to Application Service to mark application status as DISBURSED
    const appServiceUrl = process.env.APPLICATION_SERVICE_URL || 'http://localhost:3003';
    try {
      await fetch(`${appServiceUrl}/api/v1/applications/${application_id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers['authorization'] || '',
          'X-Correlation-ID': req.headers['x-correlation-id'] || ''
        },
        body: JSON.stringify({ status: 'DISBURSED', transaction_ref: transactionRef })
      });
    } catch (cbErr) {
      console.warn('[PaymentService] Application Service status callback skipped/failed:', cbErr.message);
    }

    return res.status(201).json({
      message: 'Scholarship disbursed successfully',
      disbursement: rows[0]
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Disbursement already exists for this application' });
    }
    console.error('[PaymentService] POST /disburse error:', err.message);
    return res.status(500).json({ error: 'Failed to process disbursement' });
  }
});

// GET /api/v1/payments/stats - Admin summary metrics
router.get('/stats', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total_transactions,
        COALESCE(SUM(CASE WHEN status = 'DISBURSED' THEN amount ELSE 0 END), 0)::numeric AS total_disbursed_amount,
        COUNT(*) FILTER (WHERE status = 'DISBURSED')::int AS disbursed_count,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_count
      FROM disbursements;
    `);
    return res.json({ stats: rows[0] });
  } catch (err) {
    console.error('[PaymentService] GET /stats error:', err.message);
    return res.status(500).json({ error: 'Failed to load payment statistics' });
  }
});

module.exports = router;

const { query } = require('../config/db');

class PaymentModel {
  static async create({ applicationId, amount, status = 'SUCCESS', paymentStatus = 'SUCCESS', transactionId, transactionReference, paymentDate }) {
    const txn = transactionId || transactionReference || `TXN-${Date.now()}`;
    const res = await query(
      `INSERT INTO payment (application_id, amount, status, payment_status, transaction_id, transaction_reference, payment_date, created_at)
       VALUES ($1, $2, $3, $4, $5, $5, COALESCE($6, CURRENT_DATE), NOW())
       RETURNING *`,
      [applicationId, amount, status, paymentStatus, txn, paymentDate || null]
    );
    return res.rows[0];
  }

  static async findById(id) {
    const res = await query(
      `SELECT p.*,
              a.student_id, a.scholarship_id,
              s.name as student_name, s.email as student_email,
              sch.name as scholarship_name
       FROM payment p
       JOIN application a ON p.application_id = a.application_id
       JOIN student s ON a.student_id = s.student_id
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       WHERE p.payment_id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findByApplicationId(applicationId) {
    const res = await query(
      `SELECT * FROM payment WHERE application_id = $1 ORDER BY created_at DESC`,
      [applicationId]
    );
    return res.rows;
  }

  static async findAll({ status, limit = 20, offset = 0 } = {}) {
    let where = '';
    const params = [];
    let idx = 0;

    if (status && status !== 'ALL') {
      idx++;
      where = `WHERE (p.payment_status = $${idx} OR p.status = $${idx})`;
      params.push(status);
    }

    const countRes = await query(`SELECT COUNT(*) as count FROM payment p ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    idx++; params.push(limit);
    idx++; params.push(offset);

    const res = await query(
      `SELECT p.*,
              a.application_id, a.student_id, a.scholarship_id,
              s.name as student_name, s.email as student_email,
              sch.name as scholarship_name
       FROM payment p
       JOIN application a ON p.application_id = a.application_id
       JOIN student s ON a.student_id = s.student_id
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx - 1} OFFSET $${idx}`,
      params
    );

    return { total, payments: res.rows };
  }

  static async updateStatus(paymentId, status) {
    const res = await query(
      `UPDATE payment
       SET payment_status = $1, status = $1
       WHERE payment_id = $2
       RETURNING *`,
      [status, paymentId]
    );
    return res.rows[0] || null;
  }

  static async getTotalDisbursed() {
    const res = await query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM payment
       WHERE payment_status IN ('SUCCESS', 'PAID') OR status IN ('SUCCESS', 'PAID')`
    );
    return parseFloat(res.rows[0].total);
  }
}

module.exports = PaymentModel;

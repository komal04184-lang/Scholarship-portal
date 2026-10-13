const PaymentModel = require('../models/paymentModel');
const ApplicationModel = require('../models/applicationModel');
const { query, getClient } = require('../config/db');

class PaymentService {
  /**
   * Record a scholarship disbursement
   */
  static async disbursePayment({ applicationId, amount, transactionId, paymentDate, paymentStatus = 'SUCCESS' }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Verify application is approved
      const app = await ApplicationModel.findById(applicationId);
      if (!app) {
        throw new Error('Application not found');
      }

      if (app.status !== 'APPROVED' && app.status !== 'DISBURSED') {
        throw new Error('Can only initiate payments for APPROVED applications');
      }

      const txn = transactionId || `TXN-${Date.now()}`;

      // Check duplicate txn
      const dupTxn = await client.query(`SELECT payment_id FROM payment WHERE transaction_id = $1`, [txn]);
      if (dupTxn.rows.length > 0) {
        throw new Error('A payment with this transaction ID already exists');
      }

      const payAmount = amount || app.scholarship_amount || 50000;

      const payRes = await client.query(
        `INSERT INTO payment (application_id, amount, status, payment_status, transaction_id, transaction_reference, payment_date, created_at)
         VALUES ($1, $2, $3, $3, $4, $4, COALESCE($5, CURRENT_DATE), NOW())
         RETURNING *`,
        [applicationId, payAmount, paymentStatus, txn, paymentDate || null]
      );
      const payment = payRes.rows[0];

      // Notify student
      await client.query(
        `INSERT INTO notification (student_id, title, message, type, reference_type, reference_id, created_at)
         VALUES ($1, 'Scholarship Disbursed 💰', $2, 'SUCCESS', 'PAYMENT', $3, NOW())`,
        [
          app.student_id,
          `A grant of ₹${parseFloat(payAmount).toLocaleString('en-IN')} for ${app.scholarship_name} has been processed. Transaction ID: ${txn}`,
          payment.payment_id,
        ]
      );

      // Optionally transition status to DISBURSED
      await client.query(
        `UPDATE application SET status = 'DISBURSED', updated_at = NOW() WHERE application_id = $1`,
        [applicationId]
      );

      await client.query(
        `INSERT INTO application_status (application_id, status, comment, changed_by, changed_at)
         VALUES ($1, 'DISBURSED', $2, 'FINANCE_SYSTEM', NOW())`,
        [applicationId, `Disbursement of ₹${payAmount} completed. Txn: ${txn}`]
      );

      await client.query('COMMIT');
      return payment;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async updatePaymentStatus(paymentId, status) {
    const payment = await PaymentModel.updateStatus(paymentId, status);
    if (!payment) {
      throw new Error('Payment record not found');
    }
    return payment;
  }
}

module.exports = PaymentService;

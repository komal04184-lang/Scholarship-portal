const { query, getClient } = require('../config/db');
const ApplicationModel = require('../models/applicationModel');
const ScholarshipModel = require('../models/scholarshipModel');
const EligibilityService = require('./eligibilityService');

class ApplicationService {
  /**
   * Submit a new scholarship application
   */
  static async submitApplication({ studentId, scholarshipId, statement, sop }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      // 1. Verify scholarship exists and is active
      const schRes = await client.query(
        `SELECT * FROM scholarship WHERE scholarship_id = $1 AND status = 'ACTIVE' AND deadline >= CURRENT_DATE`,
        [scholarshipId]
      );
      if (schRes.rows.length === 0) {
        throw new Error('Scholarship is not currently open or active for applications');
      }
      const scholarship = schRes.rows[0];

      // 2. Prevent duplicate application
      const dup = await client.query(
        `SELECT application_id, status FROM application WHERE student_id = $1 AND scholarship_id = $2`,
        [studentId, scholarshipId]
      );
      if (dup.rows.length > 0) {
        const err = new Error('You have already applied for this scholarship program');
        err.statusCode = 409;
        err.existing_application_id = dup.rows[0].application_id;
        throw err;
      }

      // 3. Create application
      const appRes = await client.query(
        `INSERT INTO application (student_id, scholarship_id, status, statement, sop, application_date, submitted_at, updated_at)
         VALUES ($1, $2, 'SUBMITTED', $3, $4, CURRENT_DATE, NOW(), NOW())
         RETURNING *`,
        [studentId, scholarshipId, statement || null, sop || statement || null]
      );
      const app = appRes.rows[0];

      // 4. Record initial status history
      await client.query(
        `INSERT INTO application_status (application_id, status, comment, changed_by, changed_at)
         VALUES ($1, 'SUBMITTED', $2, 'STUDENT', NOW())`,
        [app.application_id, statement || 'Application submitted by applicant']
      );

      // 5. Create notification for student
      await client.query(
        `INSERT INTO notification (student_id, title, message, type, reference_type, reference_id, created_at)
         VALUES ($1, 'Application Submitted', $2, 'INFO', 'APPLICATION', $3, NOW())`,
        [studentId, `Your application for ${scholarship.name} has been submitted successfully.`, app.application_id]
      );

      await client.query('COMMIT');
      return app;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Transition application status with validation and grant linking
   */
  static async changeStatus({ applicationId, newStatus, comment, changedBy = 'ADMIN', reviewerId = null }) {
    const client = await getClient();
    try {
      await client.query('BEGIN');

      const appRes = await client.query(`SELECT * FROM application WHERE application_id = $1`, [applicationId]);
      if (appRes.rows.length === 0) {
        throw new Error('Application not found');
      }
      const app = appRes.rows[0];
      const oldStatus = app.status;

      // State transitions
      const validTransitions = {
        SUBMITTED: ['UNDER_REVIEW', 'REJECTED'],
        UNDER_REVIEW: ['CORRECTION_REQUIRED', 'APPROVED', 'REJECTED'],
        CORRECTION_REQUIRED: ['UNDER_REVIEW', 'REJECTED'],
        APPROVED: ['DISBURSED'],
        DRAFT: ['SUBMITTED'],
      };

      if (validTransitions[oldStatus] && !validTransitions[oldStatus].includes(newStatus)) {
        throw new Error(`Cannot transition application from ${oldStatus} to ${newStatus}`);
      }

      // Update application
      if (reviewerId) {
        await client.query(
          `UPDATE application SET status = $1, reviewer_id = $2, updated_at = NOW() WHERE application_id = $3`,
          [newStatus, reviewerId, applicationId]
        );
      } else {
        await client.query(
          `UPDATE application SET status = $1, updated_at = NOW() WHERE application_id = $2`,
          [newStatus, applicationId]
        );
      }

      // Record status change history
      await client.query(
        `INSERT INTO application_status (application_id, status, comment, changed_by, changed_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [applicationId, newStatus, comment || null, changedBy]
      );

      // If approved, create or link grant_record in PostgreSQL
      if (newStatus === 'APPROVED') {
        const schRes = await client.query(`SELECT name, amount FROM scholarship WHERE scholarship_id = $1`, [app.scholarship_id]);
        const scholarship = schRes.rows[0];

        let grantRes = await client.query(
          `SELECT grant_id FROM grant_record WHERE scholarship_id = $1 LIMIT 1`,
          [app.scholarship_id]
        );
        let grantId = grantRes.rows[0]?.grant_id;

        if (!grantId) {
          const newGrant = await client.query(
            `INSERT INTO grant_record (scholarship_id, grant_name, amount, status, created_at)
             VALUES ($1, $2, $3, 'ACTIVE', NOW())
             RETURNING grant_id`,
            [app.scholarship_id, `${scholarship?.name || 'Scholarship'} Grant Award`, scholarship?.amount || 50000]
          );
          grantId = newGrant.rows[0]?.grant_id;
        }

        if (grantId) {
          await client.query(`UPDATE application SET grant_id = $1 WHERE application_id = $2`, [grantId, applicationId]);
        }
      }

      // Notification to applicant
      const notifTitles = {
        UNDER_REVIEW: 'Application Under Review',
        CORRECTION_REQUIRED: 'Document Correction Required',
        APPROVED: 'Application Approved 🎉',
        REJECTED: 'Application Status Update',
      };
      if (notifTitles[newStatus]) {
        await client.query(
          `INSERT INTO notification (student_id, title, message, type, reference_type, reference_id, created_at)
           VALUES ($1, $2, $3, 'INFO', 'APPLICATION', $4, NOW())`,
          [
            app.student_id,
            notifTitles[newStatus],
            comment || `Your application status has been updated to ${newStatus}.`,
            applicationId,
          ]
        );
      }

      await client.query('COMMIT');
      return { success: true, applicationId, oldStatus, newStatus };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = ApplicationService;

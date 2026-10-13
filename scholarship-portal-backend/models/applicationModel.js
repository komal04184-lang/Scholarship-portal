const { query, getClient } = require('../config/db');

class ApplicationModel {
  static async create({ studentId, scholarshipId, statement, sop }) {
    const res = await query(
      `INSERT INTO application (student_id, scholarship_id, status, statement, sop, application_date, submitted_at, updated_at)
       VALUES ($1, $2, 'SUBMITTED', $3, $4, CURRENT_DATE, NOW(), NOW())
       RETURNING *`,
      [studentId, scholarshipId, statement || null, sop || statement || null]
    );
    return res.rows[0];
  }

  static async findById(id) {
    const res = await query(
      `SELECT a.*,
              sch.name as scholarship_name, sch.amount as scholarship_amount, sch.description as scholarship_description, sch.deadline as scholarship_deadline,
              s.name as student_name, s.email as student_email, s.phone as student_phone, s.gender as student_gender, s.date_of_birth, s.address,
              sp.category, sp.annual_income, sp.family_size, sp.state, sp.city,
              r.name as reviewer_name, r.department as reviewer_department, r.designation as reviewer_designation,
              g.grant_name, g.amount as grant_amount, g.status as grant_status
       FROM application a
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       JOIN student s ON a.student_id = s.student_id
       LEFT JOIN student_profile sp ON s.student_id = sp.student_id
       LEFT JOIN reviewer r ON a.reviewer_id = r.reviewer_id
       LEFT JOIN grant_record g ON a.grant_id = g.grant_id
       WHERE a.application_id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async findByStudentId(studentId) {
    const res = await query(
      `SELECT a.*,
              sch.name as scholarship_name, sch.amount as scholarship_amount, sch.deadline as scholarship_deadline,
              r.name as reviewer_name, r.designation as reviewer_designation,
              g.grant_name, g.amount as grant_amount,
              (SELECT COUNT(*) FROM application_document ad WHERE ad.application_id = a.application_id) as document_count
       FROM application a
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       LEFT JOIN reviewer r ON a.reviewer_id = r.reviewer_id
       LEFT JOIN grant_record g ON a.grant_id = g.grant_id
       WHERE a.student_id = $1
       ORDER BY a.updated_at DESC`,
      [studentId]
    );
    return res.rows;
  }

  static async findExisting(studentId, scholarshipId) {
    const res = await query(
      `SELECT application_id, status FROM application WHERE student_id = $1 AND scholarship_id = $2`,
      [studentId, scholarshipId]
    );
    return res.rows[0] || null;
  }

  static async findAll({ search, status, scholarshipId, limit = 20, offset = 0 } = {}) {
    const conditions = [];
    const params = [];
    let idx = 0;

    if (search) {
      idx++;
      conditions.push(`(s.name ILIKE $${idx} OR s.email ILIKE $${idx} OR CAST(a.application_id AS TEXT) LIKE $${idx})`);
      params.push(`%${search}%`);
    }

    if (status && status !== 'ALL') {
      idx++;
      conditions.push(`a.status = $${idx}`);
      params.push(status);
    }

    if (scholarshipId) {
      idx++;
      conditions.push(`a.scholarship_id = $${idx}`);
      params.push(scholarshipId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) FROM application a
       JOIN student s ON a.student_id = s.student_id
       ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count, 10);

    idx++; params.push(parseInt(limit, 10));
    idx++; params.push(parseInt(offset, 10));

    const result = await query(
      `SELECT a.*,
              s.name as student_name, s.email as student_email, s.phone as student_phone,
              sp.category, sp.annual_income,
              ad.cgpa, ad.course, ad.branch,
              sch.name as scholarship_name, sch.amount as scholarship_amount,
              r.name as reviewer_name, r.designation as reviewer_designation,
              g.grant_name,
              (SELECT COUNT(*) FROM application_document doc WHERE doc.application_id = a.application_id) as doc_count,
              (SELECT COUNT(*) FROM application_document doc WHERE doc.application_id = a.application_id AND doc.verification_status = 'VERIFIED') as verified_doc_count
       FROM application a
       JOIN student s ON a.student_id = s.student_id
       LEFT JOIN student_profile sp ON s.student_id = sp.student_id
       LEFT JOIN (
         SELECT DISTINCT ON (student_id) student_id, cgpa, course, branch FROM academic_details ORDER BY student_id, academic_id DESC
       ) ad ON s.student_id = ad.student_id
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       LEFT JOIN reviewer r ON a.reviewer_id = r.reviewer_id
       LEFT JOIN grant_record g ON a.grant_id = g.grant_id
       ${where}
       ORDER BY a.updated_at DESC
       LIMIT $${idx - 1} OFFSET $${idx}`,
      params
    );

    return { total, applications: result.rows };
  }

  static async updateStatus(applicationId, status, reviewerId = null) {
    let res;
    if (reviewerId) {
      res = await query(
        `UPDATE application
         SET status = $1, reviewer_id = $2, updated_at = NOW()
         WHERE application_id = $3
         RETURNING *`,
        [status, reviewerId, applicationId]
      );
    } else {
      res = await query(
        `UPDATE application
         SET status = $1, updated_at = NOW()
         WHERE application_id = $2
         RETURNING *`,
        [status, applicationId]
      );
    }
    return res.rows[0] || null;
  }

  static async linkGrant(applicationId, grantId) {
    const res = await query(
      `UPDATE application SET grant_id = $1, updated_at = NOW() WHERE application_id = $2 RETURNING *`,
      [grantId, applicationId]
    );
    return res.rows[0] || null;
  }

  static async addStatusHistory(applicationId, status, comment, changedBy = 'SYSTEM') {
    const res = await query(
      `INSERT INTO application_status (application_id, status, comment, changed_by, changed_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [applicationId, status, comment || null, changedBy]
    );
    return res.rows[0];
  }

  static async getStatusHistory(applicationId) {
    const res = await query(
      `SELECT status_id, application_id, status, comment, changed_by, changed_at
       FROM application_status
       WHERE application_id = $1
       ORDER BY changed_at ASC, status_id ASC`,
      [applicationId]
    );
    return res.rows;
  }
}

module.exports = ApplicationModel;

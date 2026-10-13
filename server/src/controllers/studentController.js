const { pool } = require('../config/database');
const logger = require('../config/logger');

/**
 * GET /api/v1/student/profile
 */
async function getProfile(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT s.student_id, s.name, s.email, s.phone, s.date_of_birth, s.gender, s.address, s.created_at,
              sp.category, sp.annual_income, sp.family_size, sp.state, sp.city
       FROM student s
       LEFT JOIN student_profile sp ON s.student_id = sp.student_id
       WHERE s.student_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.json({ profile: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/student/profile
 */
async function updateProfile(req, res, next) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { name, phone, date_of_birth, gender, address, category, annual_income, cgpa, family_size, state, city } = req.body;

    // Update student table
    await client.query(
      `UPDATE student
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           date_of_birth = COALESCE($3, date_of_birth),
           gender = COALESCE($4, gender),
           address = COALESCE($5, address)
       WHERE student_id = $6`,
      [name, phone, date_of_birth || null, gender, address, req.user.id]
    );

    // Upsert profile
    await client.query(
      `INSERT INTO student_profile (student_id, category, annual_income, family_size, state, city)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (student_id) DO UPDATE SET
         category = COALESCE($2, student_profile.category),
         annual_income = COALESCE($3, student_profile.annual_income),
         family_size = COALESCE($4, student_profile.family_size),
         state = COALESCE($5, student_profile.state),
         city = COALESCE($6, student_profile.city)`,
      [req.user.id, category, annual_income, family_size, state, city]
    );

    // Update academic_details CGPA if provided
    if (cgpa !== undefined && cgpa !== null && !isNaN(parseFloat(cgpa))) {
      const parsedCgpa = parseFloat(cgpa);
      const acadCheck = await client.query('SELECT academic_id FROM academic_details WHERE student_id = $1 LIMIT 1', [req.user.id]);
      if (acadCheck.rows.length > 0) {
        await client.query('UPDATE academic_details SET cgpa = $1 WHERE student_id = $2', [parsedCgpa, req.user.id]);
      } else {
        await client.query(
          `INSERT INTO academic_details (student_id, institution_name, course, branch, semester, cgpa, passing_year)
           VALUES ($1, 'University Campus', 'B.Tech', 'Engineering', 6, $2, 2026)`,
          [req.user.id, parsedCgpa]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch updated profile
    const result = await pool.query(
      `SELECT s.student_id, s.name, s.email, s.phone, s.date_of_birth, s.gender, s.address,
              sp.category, sp.annual_income, sp.family_size, sp.state, sp.city
       FROM student s
       LEFT JOIN student_profile sp ON s.student_id = sp.student_id
       WHERE s.student_id = $1`,
      [req.user.id]
    );

    logger.info('Profile updated', { studentId: req.user.id });
    res.json({ message: 'Profile updated successfully', profile: result.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

/**
 * GET /api/v1/student/academics
 */
async function getAcademics(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM academic_details WHERE student_id = $1 ORDER BY academic_id DESC',
      [req.user.id]
    );
    res.json({ academics: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/student/academics
 */
async function addAcademic(req, res, next) {
  try {
    const { institution_name, course, branch, semester, cgpa, passing_year } = req.body;
    const result = await pool.query(
      `INSERT INTO academic_details (student_id, institution_name, course, branch, semester, cgpa, passing_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, institution_name, course, branch, semester, cgpa, passing_year]
    );
    res.status(201).json({ message: 'Academic record added', academic: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/student/academics/:id
 */
async function updateAcademic(req, res, next) {
  try {
    const { id } = req.params;

    // Verify ownership
    const check = await pool.query(
      'SELECT academic_id FROM academic_details WHERE academic_id = $1 AND student_id = $2',
      [id, req.user.id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Academic record not found' });
    }

    const { institution_name, course, branch, semester, cgpa, passing_year } = req.body;
    const result = await pool.query(
      `UPDATE academic_details
       SET institution_name = $1, course = $2, branch = $3, semester = $4, cgpa = $5, passing_year = $6
       WHERE academic_id = $7 AND student_id = $8
       RETURNING *`,
      [institution_name, course, branch, semester, cgpa, passing_year, id, req.user.id]
    );
    res.json({ message: 'Academic record updated', academic: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/student/academics/:id
 */
async function deleteAcademic(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM academic_details WHERE academic_id = $1 AND student_id = $2 RETURNING academic_id',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Academic record not found' });
    }
    res.json({ message: 'Academic record deleted' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/student/dashboard
 */
async function getDashboard(req, res, next) {
  try {
    const studentId = req.user.id;

    // Profile completeness
    const profileRes = await pool.query(
      `SELECT s.name, s.phone, s.date_of_birth, s.gender, s.address,
              sp.category, sp.annual_income, sp.state, sp.city
       FROM student s
       LEFT JOIN student_profile sp ON s.student_id = sp.student_id
       WHERE s.student_id = $1`,
      [studentId]
    );
    const profile = profileRes.rows[0] || {};
    const profileFields = ['name', 'phone', 'date_of_birth', 'gender', 'address', 'category', 'annual_income', 'state', 'city'];
    const filledFields = profileFields.filter(f => profile[f] !== null && profile[f] !== '');
    const profileCompletion = Math.round((filledFields.length / profileFields.length) * 100);

    // Scholarship counts
    const totalScholarships = await pool.query(
      "SELECT COUNT(*) as count FROM scholarship WHERE status IN ('ACTIVE', 'Open')"
    );

    // Application counts
    const appCounts = await pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'SUBMITTED' OR status = 'Submitted' OR status = 'UNDER_REVIEW') as pending,
         COUNT(*) FILTER (WHERE status = 'APPROVED' OR status = 'Approved') as approved,
         COUNT(*) FILTER (WHERE status = 'REJECTED' OR status = 'Rejected') as rejected,
         COUNT(*) FILTER (WHERE status = 'DRAFT') as drafts
       FROM application WHERE student_id = $1`,
      [studentId]
    );

    // Recent applications
    const recentApps = await pool.query(
      `SELECT a.application_id, a.status, a.submitted_at, a.updated_at,
              sch.name as scholarship_name, sch.amount
       FROM application a
       JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
       WHERE a.student_id = $1
       ORDER BY a.updated_at DESC LIMIT 5`,
      [studentId]
    );

    // Upcoming deadlines
    const deadlines = await pool.query(
      `SELECT scholarship_id, name, deadline, amount
       FROM scholarship
       WHERE status IN ('ACTIVE', 'Open') AND (deadline IS NULL OR deadline > NOW())
       ORDER BY deadline ASC NULLS LAST LIMIT 5`
    );

    // Notifications
    const notifications = await pool.query(
      `SELECT * FROM notification
       WHERE student_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [studentId]
    );

    res.json({
      profileCompletion,
      totalScholarships: parseInt(totalScholarships.rows[0].count),
      applications: {
        total: parseInt(appCounts.rows[0].total),
        pending: parseInt(appCounts.rows[0].pending),
        approved: parseInt(appCounts.rows[0].approved),
        rejected: parseInt(appCounts.rows[0].rejected),
        drafts: parseInt(appCounts.rows[0].drafts),
      },
      recentApplications: recentApps.rows,
      upcomingDeadlines: deadlines.rows,
      notifications: notifications.rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/student/notifications
 */
async function getNotifications(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT * FROM notification
       WHERE student_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/student/notifications/:id/read
 */
async function markNotificationRead(req, res, next) {
  try {
    await pool.query(
      'UPDATE notification SET is_read = TRUE WHERE notification_id = $1 AND student_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile, updateProfile,
  getAcademics, addAcademic, updateAcademic, deleteAcademic,
  getDashboard, getNotifications, markNotificationRead,
};

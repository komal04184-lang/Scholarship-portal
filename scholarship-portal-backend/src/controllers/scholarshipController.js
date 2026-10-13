const { pool } = require('../config/database');
const logger = require('../config/logger');

/**
 * GET /api/v1/scholarships
 * Public endpoint for listing scholarships with search, filter, sort, pagination.
 */
async function listScholarships(req, res, next) {
  try {
    const {
      search, category, course, status, min_amount, max_amount,
      sort_by = 'deadline', sort_order = 'ASC',
      page = 1, limit = 12,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = [];
    let paramIdx = 0;

    if (search) {
      paramIdx++;
      conditions.push(`(s.name ILIKE $${paramIdx} OR s.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
    }

    if (status) {
      paramIdx++;
      conditions.push(`s.status = $${paramIdx}`);
      params.push(status);
    }

    if (category) {
      paramIdx++;
      conditions.push(`ec.eligible_category = $${paramIdx}`);
      params.push(category);
    }

    if (course) {
      paramIdx++;
      conditions.push(`ec.eligible_course = $${paramIdx}`);
      params.push(course);
    }

    if (min_amount) {
      paramIdx++;
      conditions.push(`s.amount >= $${paramIdx}`);
      params.push(parseFloat(min_amount));
    }

    if (max_amount) {
      paramIdx++;
      conditions.push(`s.amount <= $${paramIdx}`);
      params.push(parseFloat(max_amount));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort
    const allowedSorts = { deadline: 's.deadline', amount: 's.amount', name: 's.name', created_at: 's.created_at' };
    const sortCol = allowedSorts[sort_by] || 's.deadline';
    const sortDir = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Count
    const countQuery = `
      SELECT COUNT(DISTINCT s.scholarship_id) as total
      FROM scholarship s
      LEFT JOIN eligibility_criteria ec ON s.scholarship_id = ec.scholarship_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);

    // Fetch
    paramIdx++;
    params.push(parseInt(limit));
    paramIdx++;
    params.push(offset);

    const dataQuery = `
      SELECT s.*, ec.minimum_cgpa, ec.maximum_income, ec.eligible_course, ec.eligible_category,
             ec.minimum_age, ec.maximum_age
      FROM scholarship s
      LEFT JOIN eligibility_criteria ec ON s.scholarship_id = ec.scholarship_id
      ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${paramIdx - 1} OFFSET $${paramIdx}
    `;
    const result = await pool.query(dataQuery, params);

    res.json({
      scholarships: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/scholarships/featured
 */
async function getFeaturedScholarships(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT s.*, ec.minimum_cgpa, ec.eligible_course, ec.eligible_category
       FROM scholarship s
       LEFT JOIN eligibility_criteria ec ON s.scholarship_id = ec.scholarship_id
       WHERE s.status = 'ACTIVE' AND s.deadline > NOW()
       ORDER BY s.amount DESC
       LIMIT 6`
    );
    res.json({ scholarships: result.rows });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/scholarships/:id
 */
async function getScholarship(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT s.*, ec.criteria_id, ec.minimum_cgpa, ec.maximum_income, ec.eligible_course,
              ec.eligible_category, ec.minimum_age, ec.maximum_age
       FROM scholarship s
       LEFT JOIN eligibility_criteria ec ON s.scholarship_id = ec.scholarship_id
       WHERE s.scholarship_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Scholarship not found' });
    }

    // Get required documents
    const docs = await pool.query(
      'SELECT * FROM required_document WHERE scholarship_id = $1 ORDER BY mandatory DESC, document_name',
      [id]
    );

    res.json({
      scholarship: result.rows[0],
      requiredDocuments: docs.rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/scholarships/:id/check-eligibility
 * Authenticated student endpoint.
 */
async function checkEligibility(req, res, next) {
  try {
    const { id } = req.params;
    const studentId = req.user.id;

    // Get scholarship criteria
    const schResult = await pool.query(
      `SELECT s.*, ec.minimum_cgpa, ec.maximum_income, ec.eligible_course,
              ec.eligible_category, ec.minimum_age, ec.maximum_age
       FROM scholarship s
       LEFT JOIN eligibility_criteria ec ON s.scholarship_id = ec.scholarship_id
       WHERE s.scholarship_id = $1`,
      [id]
    );

    if (schResult.rows.length === 0) {
      return res.status(404).json({ error: 'Scholarship not found' });
    }

    const scholarship = schResult.rows[0];

    // Get student profile
    const profileResult = await pool.query(
      `SELECT s.date_of_birth, sp.category, sp.annual_income
       FROM student s
       LEFT JOIN student_profile sp ON s.student_id = sp.student_id
       WHERE s.student_id = $1`,
      [studentId]
    );

    // Get academic details
    const academicResult = await pool.query(
      `SELECT course, cgpa FROM academic_details
       WHERE student_id = $1 ORDER BY cgpa DESC LIMIT 1`,
      [studentId]
    );

    const profile = profileResult.rows[0] || {};
    const academic = academicResult.rows[0] || {};

    const criteria = [];
    const missing = [];
    let eligible = true;

    // CGPA check
    if (scholarship.minimum_cgpa !== null) {
      if (!academic.cgpa && academic.cgpa !== 0) {
        missing.push('CGPA (add academic details)');
        eligible = false;
      } else if (parseFloat(academic.cgpa) >= parseFloat(scholarship.minimum_cgpa)) {
        criteria.push({ criterion: 'Minimum CGPA', required: scholarship.minimum_cgpa, yours: academic.cgpa, met: true });
      } else {
        criteria.push({ criterion: 'Minimum CGPA', required: scholarship.minimum_cgpa, yours: academic.cgpa, met: false });
        eligible = false;
      }
    }

    // Income check
    if (scholarship.maximum_income !== null) {
      if (!profile.annual_income && profile.annual_income !== 0) {
        missing.push('Annual family income (update profile)');
        eligible = false;
      } else if (parseFloat(profile.annual_income) <= parseFloat(scholarship.maximum_income)) {
        criteria.push({ criterion: 'Maximum Family Income', required: `₹${scholarship.maximum_income}`, yours: `₹${profile.annual_income}`, met: true });
      } else {
        criteria.push({ criterion: 'Maximum Family Income', required: `₹${scholarship.maximum_income}`, yours: `₹${profile.annual_income}`, met: false });
        eligible = false;
      }
    }

    // Course check
    if (scholarship.eligible_course) {
      if (!academic.course) {
        missing.push('Course (add academic details)');
        eligible = false;
      } else if (academic.course.toLowerCase() === scholarship.eligible_course.toLowerCase()) {
        criteria.push({ criterion: 'Eligible Course', required: scholarship.eligible_course, yours: academic.course, met: true });
      } else {
        criteria.push({ criterion: 'Eligible Course', required: scholarship.eligible_course, yours: academic.course, met: false });
        eligible = false;
      }
    }

    // Category check
    if (scholarship.eligible_category) {
      if (!profile.category) {
        missing.push('Category (update profile)');
        eligible = false;
      } else if (profile.category === scholarship.eligible_category) {
        criteria.push({ criterion: 'Eligible Category', required: scholarship.eligible_category, yours: profile.category, met: true });
      } else {
        criteria.push({ criterion: 'Eligible Category', required: scholarship.eligible_category, yours: profile.category, met: false });
        eligible = false;
      }
    }

    // Age check
    if ((scholarship.minimum_age !== null || scholarship.maximum_age !== null) && profile.date_of_birth) {
      const dob = new Date(profile.date_of_birth);
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;

      if (scholarship.minimum_age !== null && age < scholarship.minimum_age) {
        criteria.push({ criterion: 'Minimum Age', required: scholarship.minimum_age, yours: age, met: false });
        eligible = false;
      } else if (scholarship.minimum_age !== null) {
        criteria.push({ criterion: 'Minimum Age', required: scholarship.minimum_age, yours: age, met: true });
      }

      if (scholarship.maximum_age !== null && age > scholarship.maximum_age) {
        criteria.push({ criterion: 'Maximum Age', required: scholarship.maximum_age, yours: age, met: false });
        eligible = false;
      } else if (scholarship.maximum_age !== null) {
        criteria.push({ criterion: 'Maximum Age', required: scholarship.maximum_age, yours: age, met: true });
      }
    } else if (scholarship.minimum_age !== null || scholarship.maximum_age !== null) {
      missing.push('Date of birth (update profile)');
    }

    res.json({
      eligible: eligible && missing.length === 0,
      criteria,
      missing,
      scholarship_name: scholarship.name,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listScholarships, getFeaturedScholarships, getScholarship, checkEligibility };

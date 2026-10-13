const { query, getClient } = require('../config/db');

class ScholarshipModel {
  static async findAll({ search, category, course, status, minAmount, maxAmount, sortBy = 'deadline', sortOrder = 'ASC', limit = 20, offset = 0 } = {}) {
    const conditions = [];
    const params = [];
    let idx = 0;

    if (search) {
      idx++;
      conditions.push(`(s.name ILIKE $${idx} OR s.description ILIKE $${idx})`);
      params.push(`%${search}%`);
    }

    if (status) {
      idx++;
      conditions.push(`s.status = $${idx}`);
      params.push(status);
    }

    if (category) {
      idx++;
      conditions.push(`ec.eligible_category = $${idx}`);
      params.push(category);
    }

    if (course) {
      idx++;
      conditions.push(`ec.eligible_course = $${idx}`);
      params.push(course);
    }

    if (minAmount) {
      idx++;
      conditions.push(`s.amount >= $${idx}`);
      params.push(parseFloat(minAmount));
    }

    if (maxAmount) {
      idx++;
      conditions.push(`s.amount <= $${idx}`);
      params.push(parseFloat(maxAmount));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const allowedSortCols = {
      deadline: 's.deadline',
      amount: 's.amount',
      name: 's.name',
      created_at: 's.created_at',
      scholarship_id: 's.scholarship_id',
    };
    const sortCol = allowedSortCols[sortBy] || 's.deadline';
    const sortDir = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const countRes = await query(
      `SELECT COUNT(DISTINCT s.scholarship_id) as total
       FROM scholarship s
       LEFT JOIN eligibility_criteria ec ON s.scholarship_id = ec.scholarship_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].total, 10);

    idx++; params.push(parseInt(limit, 10));
    idx++; params.push(parseInt(offset, 10));

    const dataRes = await query(
      `SELECT s.*,
              ec.criteria_id, ec.minimum_cgpa, ec.maximum_income, ec.eligible_course,
              ec.eligible_category, ec.minimum_age, ec.maximum_age,
              (SELECT COUNT(*) FROM application a WHERE a.scholarship_id = s.scholarship_id) as application_count
       FROM scholarship s
       LEFT JOIN eligibility_criteria ec ON s.scholarship_id = ec.scholarship_id
       ${whereClause}
       ORDER BY ${sortCol} ${sortDir}
       LIMIT $${idx - 1} OFFSET $${idx}`,
      params
    );

    return { total, scholarships: dataRes.rows };
  }

  static async findById(id) {
    const res = await query(
      `SELECT s.*,
              ec.criteria_id, ec.minimum_cgpa, ec.maximum_income, ec.eligible_course,
              ec.eligible_category, ec.minimum_age, ec.maximum_age
       FROM scholarship s
       LEFT JOIN eligibility_criteria ec ON s.scholarship_id = ec.scholarship_id
       WHERE s.scholarship_id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  static async create({ name, description, amount, status = 'ACTIVE', deadline }) {
    const res = await query(
      `INSERT INTO scholarship (name, description, amount, status, deadline, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING *`,
      [name, description, amount, status, deadline || '2027-05-31']
    );
    return res.rows[0];
  }

  static async update(id, { name, description, amount, status, deadline }) {
    const res = await query(
      `UPDATE scholarship
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           amount = COALESCE($3, amount),
           status = COALESCE($4, status),
           deadline = COALESCE($5, deadline)
       WHERE scholarship_id = $6
       RETURNING *`,
      [name, description, amount, status, deadline, id]
    );
    return res.rows[0] || null;
  }

  static async getEligibilityCriteria(scholarshipId) {
    const res = await query(
      `SELECT * FROM eligibility_criteria WHERE scholarship_id = $1`,
      [scholarshipId]
    );
    return res.rows[0] || null;
  }

  static async upsertEligibilityCriteria(scholarshipId, { minimum_cgpa, maximum_income, eligible_course, eligible_category, minimum_age, maximum_age }) {
    const res = await query(
      `INSERT INTO eligibility_criteria (scholarship_id, minimum_cgpa, maximum_income, eligible_course, eligible_category, minimum_age, maximum_age)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (scholarship_id) DO UPDATE SET
         minimum_cgpa = COALESCE($2, eligibility_criteria.minimum_cgpa),
         maximum_income = COALESCE($3, eligibility_criteria.maximum_income),
         eligible_course = COALESCE($4, eligibility_criteria.eligible_course),
         eligible_category = COALESCE($5, eligibility_criteria.eligible_category),
         minimum_age = COALESCE($6, eligibility_criteria.minimum_age),
         maximum_age = COALESCE($7, eligibility_criteria.maximum_age)
       RETURNING *`,
      [scholarshipId, minimum_cgpa, maximum_income, eligible_course || null, eligible_category || null, minimum_age || null, maximum_age || null]
    );
    return res.rows[0];
  }

  static async getRequiredDocuments(scholarshipId) {
    const res = await query(
      `SELECT * FROM required_document WHERE scholarship_id = $1 ORDER BY mandatory DESC, document_name ASC`,
      [scholarshipId]
    );
    return res.rows;
  }

  static async addRequiredDocument(scholarshipId, { document_name, mandatory = true }) {
    const res = await query(
      `INSERT INTO required_document (scholarship_id, document_name, mandatory)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [scholarshipId, document_name, mandatory]
    );
    return res.rows[0];
  }

  static async deleteRequiredDocument(requirementId) {
    const res = await query(
      `DELETE FROM required_document WHERE requirement_id = $1 RETURNING *`,
      [requirementId]
    );
    return res.rows[0] || null;
  }
}

module.exports = ScholarshipModel;

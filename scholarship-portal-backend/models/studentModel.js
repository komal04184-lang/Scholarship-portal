const { query } = require('../config/db');

class StudentModel {
  static async findById(studentId) {
    const res = await query(
      `SELECT student_id, name, email, phone, date_of_birth, gender, address, created_at
       FROM student WHERE student_id = $1`,
      [studentId]
    );
    return res.rows[0] || null;
  }

  static async findByEmail(email) {
    const res = await query(
      `SELECT student_id, name, email, password, password_hash, phone, date_of_birth, gender, address, created_at
       FROM student WHERE email = $1`,
      [email]
    );
    return res.rows[0] || null;
  }

  static async create({ name, email, password, passwordHash, phone, date_of_birth, gender, address }) {
    const res = await query(
      `INSERT INTO student (name, email, password, password_hash, phone, date_of_birth, gender, address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING student_id, name, email, phone, date_of_birth, gender, address, created_at`,
      [name, email, password, passwordHash || password, phone || null, date_of_birth || null, gender || null, address || null]
    );
    return res.rows[0];
  }

  static async update(studentId, { name, phone, address, gender, date_of_birth }) {
    const res = await query(
      `UPDATE student
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           address = COALESCE($3, address),
           gender = COALESCE($4, gender),
           date_of_birth = COALESCE($5, date_of_birth)
       WHERE student_id = $6
       RETURNING student_id, name, email, phone, date_of_birth, gender, address`,
      [name, phone, address, gender, date_of_birth, studentId]
    );
    return res.rows[0];
  }

  static async getProfile(studentId) {
    const res = await query(
      `SELECT profile_id, student_id, category, annual_income, family_size, state, city
       FROM student_profile WHERE student_id = $1`,
      [studentId]
    );
    return res.rows[0] || null;
  }

  static async upsertProfile(studentId, { category, annual_income, family_size, state, city }) {
    const res = await query(
      `INSERT INTO student_profile (student_id, category, annual_income, family_size, state, city)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (student_id) DO UPDATE SET
         category = COALESCE($2, student_profile.category),
         annual_income = COALESCE($3, student_profile.annual_income),
         family_size = COALESCE($4, student_profile.family_size),
         state = COALESCE($5, student_profile.state),
         city = COALESCE($6, student_profile.city)
       RETURNING profile_id, student_id, category, annual_income, family_size, state, city`,
      [studentId, category, annual_income, family_size, state, city]
    );
    return res.rows[0];
  }

  static async getAcademicDetails(studentId) {
    const res = await query(
      `SELECT academic_id, student_id, institution_name, course, branch, semester, cgpa, passing_year
       FROM academic_details WHERE student_id = $1 ORDER BY academic_id DESC`,
      [studentId]
    );
    return res.rows;
  }

  static async addAcademicDetails(studentId, { institution_name, course, branch, semester, cgpa, passing_year }) {
    const res = await query(
      `INSERT INTO academic_details (student_id, institution_name, course, branch, semester, cgpa, passing_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING academic_id, student_id, institution_name, course, branch, semester, cgpa, passing_year`,
      [studentId, institution_name, course, branch, semester, cgpa, passing_year]
    );
    return res.rows[0];
  }

  static async updateAcademicDetails(studentId, { institution_name, course, branch, semester, cgpa, passing_year }) {
    const existing = await this.getAcademicDetails(studentId);
    if (existing.length > 0) {
      const res = await query(
        `UPDATE academic_details
         SET institution_name = COALESCE($1, institution_name),
             course = COALESCE($2, course),
             branch = COALESCE($3, branch),
             semester = COALESCE($4, semester),
             cgpa = COALESCE($5, cgpa),
             passing_year = COALESCE($6, passing_year)
         WHERE academic_id = $7
         RETURNING *`,
        [institution_name, course, branch, semester, cgpa, passing_year, existing[0].academic_id]
      );
      return res.rows[0];
    } else {
      return this.addAcademicDetails(studentId, { institution_name, course, branch, semester, cgpa, passing_year });
    }
  }

  static async findAll({ search, limit = 20, offset = 0 } = {}) {
    let where = '';
    const params = [];
    let idx = 0;

    if (search) {
      idx++;
      where = `WHERE (s.name ILIKE $${idx} OR s.email ILIKE $${idx} OR s.phone ILIKE $${idx})`;
      params.push(`%${search}%`);
    }

    const countRes = await query(`SELECT COUNT(*) as count FROM student s ${where}`, params);
    const total = parseInt(countRes.rows[0].count, 10);

    idx++; params.push(limit);
    idx++; params.push(offset);

    const dataRes = await query(
      `SELECT s.student_id, s.name, s.email, s.phone, s.date_of_birth, s.gender, s.address, s.created_at,
              sp.category, sp.annual_income, sp.family_size, sp.state, sp.city,
              ad.institution_name, ad.course, ad.branch, ad.cgpa, ad.passing_year,
              (SELECT COUNT(*) FROM application a WHERE a.student_id = s.student_id) as application_count
       FROM student s
       LEFT JOIN student_profile sp ON s.student_id = sp.student_id
       LEFT JOIN (
         SELECT DISTINCT ON (student_id) * FROM academic_details ORDER BY student_id, academic_id DESC
       ) ad ON s.student_id = ad.student_id
       ${where}
       ORDER BY s.student_id DESC
       LIMIT $${idx - 1} OFFSET $${idx}`,
      params
    );

    return { total, students: dataRes.rows };
  }
}

module.exports = StudentModel;

const { query } = require("../db/db");

const toNullableNumber = (val) =>
  (val !== undefined && val !== null && String(val).trim() !== "" && !isNaN(val)) ? Number(val) : null;

class ProfileRepository {
  static formatProfile(row) {
    if (!row) return null;

    return {
      id: row.profile_id || row.id,
      user_id: row.user_id,
      username: row.username,
      email: row.email,
      role: row.role,
      status: row.status,
      enrollment_no: row.enrollment_no,
      date_of_birth: row.dob ? new Date(row.dob).toISOString().split("T")[0] : null,
      dob: row.dob ? new Date(row.dob).toISOString().split("T")[0] : null,
      gender: row.gender,
      phone: row.phone,
      address: row.address,
      city: row.city,
      state: row.state,
      country: row.country || "India",
      category: row.category,
      family_income: row.family_income !== null ? Number(row.family_income) : null,
      family_size: row.family_size !== null ? Number(row.family_size) : null,
      profile_complete: row.profile_complete,
      academic_details: {
        institution_name: row.institution_name || "",
        course: row.course || "",
        branch: row.branch || "",
        academic_year: row.academic_year || "",
        semester: row.semester !== null ? Number(row.semester) : null,
        cgpa: row.cgpa !== null ? Number(row.cgpa) : null,
        passing_year: row.passing_year !== null ? Number(row.passing_year) : null,
        marks_percentage: row.marks_percentage !== null ? Number(row.marks_percentage) : null,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  static calculateCompletion(data) {
    const essential = [
      data.phone,
      data.gender,
      data.dob || data.date_of_birth,
      data.address,
      data.city,
      data.state,
      data.category,
      data.institution_name,
      data.course,
      data.cgpa || data.marks_percentage,
    ];
    const filled = essential.filter((v) => v !== undefined && v !== null && String(v).trim() !== "");
    return filled.length >= 7;
  }

  static async createProfile(profileData, client = null) {
    const q = client ? client.query.bind(client) : query;
    const academic = profileData.academic_details || {};
    const dob = profileData.date_of_birth || profileData.dob || null;
    const comp = this.calculateCompletion({
      ...profileData,
      institution_name: academic.institution_name || profileData.institution_name,
      course: academic.course || profileData.course,
      cgpa: academic.cgpa || profileData.cgpa,
    });

    const sql = `
      INSERT INTO student_profiles (
        user_id, enrollment_no, dob, gender, phone, address, city, state, country,
        category, family_income, family_size, institution_name, course, branch,
        academic_year, semester, cgpa, passing_year, marks_percentage, profile_complete
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      )
      RETURNING *
    `;

    const values = [
      profileData.user_id,
      profileData.enrollment_no || null,
      dob,
      profileData.gender || null,
      profileData.phone || null,
      profileData.address || null,
      profileData.city || null,
      profileData.state || null,
      profileData.country || "India",
      profileData.category || null,
      profileData.family_income !== undefined ? toNullableNumber(profileData.family_income) : null,
      profileData.family_size !== undefined ? toNullableNumber(profileData.family_size) : null,
      academic.institution_name || profileData.institution_name || null,
      academic.course || profileData.course || null,
      academic.branch || profileData.branch || null,
      academic.academic_year || profileData.academic_year || null,
      academic.semester !== undefined ? toNullableNumber(academic.semester) : null,
      academic.cgpa !== undefined ? toNullableNumber(academic.cgpa) : null,
      academic.passing_year !== undefined ? toNullableNumber(academic.passing_year) : null,
      academic.marks_percentage !== undefined ? toNullableNumber(academic.marks_percentage) : null,
      comp,
    ];

    const res = await q(sql, values);
    return res.rows[0];
  }

  static async findByUserId(userId) {
    const sql = `
      SELECT sp.*, sp.id AS profile_id, u.username, u.email, u.role, u.status
      FROM student_profiles sp
      JOIN users u ON u.id = sp.user_id
      WHERE sp.user_id = $1
    `;
    const res = await query(sql, [userId]);
    return this.formatProfile(res.rows[0]);
  }

  static async findById(id) {
    const sql = `
      SELECT sp.*, sp.id AS profile_id, u.username, u.email, u.role, u.status
      FROM student_profiles sp
      JOIN users u ON u.id = sp.user_id
      WHERE sp.id = $1 OR sp.user_id = $1
    `;
    const res = await query(sql, [id]);
    return this.formatProfile(res.rows[0]);
  }

  static async updateByUserId(userId, updates) {
    // Check if profile exists, if not create it
    const existing = await query("SELECT * FROM student_profiles WHERE user_id = $1", [userId]);
    if (existing.rowCount === 0) {
      return this.createProfile({ user_id: userId, ...updates });
    }

    const current = existing.rows[0];
    const academic = updates.academic_details || {};

    const phone = updates.phone !== undefined ? updates.phone : current.phone;
    const dob = updates.date_of_birth !== undefined ? updates.date_of_birth : (updates.dob !== undefined ? updates.dob : current.dob);
    const gender = updates.gender !== undefined ? updates.gender : current.gender;
    const address = updates.address !== undefined ? updates.address : current.address;
    const city = updates.city !== undefined ? updates.city : current.city;
    const state = updates.state !== undefined ? updates.state : current.state;
    const country = updates.country !== undefined ? updates.country : current.country;
    const category = updates.category !== undefined ? updates.category : current.category;
    const family_income = updates.family_income !== undefined ? toNullableNumber(updates.family_income) : current.family_income;
    const family_size = updates.family_size !== undefined ? toNullableNumber(updates.family_size) : current.family_size;
    const enrollment_no = updates.enrollment_no !== undefined ? updates.enrollment_no : current.enrollment_no;

    const institution_name = academic.institution_name !== undefined ? academic.institution_name : (updates.institution_name !== undefined ? updates.institution_name : current.institution_name);
    const course = academic.course !== undefined ? academic.course : (updates.course !== undefined ? updates.course : current.course);
    const branch = academic.branch !== undefined ? academic.branch : (updates.branch !== undefined ? updates.branch : current.branch);
    const academic_year = academic.academic_year !== undefined ? academic.academic_year : (updates.academic_year !== undefined ? updates.academic_year : current.academic_year);
    const semester = academic.semester !== undefined ? toNullableNumber(academic.semester) : (updates.semester !== undefined ? toNullableNumber(updates.semester) : current.semester);
    const cgpa = academic.cgpa !== undefined ? toNullableNumber(academic.cgpa) : (updates.cgpa !== undefined ? toNullableNumber(updates.cgpa) : current.cgpa);
    const passing_year = academic.passing_year !== undefined ? toNullableNumber(academic.passing_year) : (updates.passing_year !== undefined ? toNullableNumber(updates.passing_year) : current.passing_year);
    const marks_percentage = academic.marks_percentage !== undefined ? toNullableNumber(academic.marks_percentage) : (updates.marks_percentage !== undefined ? toNullableNumber(updates.marks_percentage) : current.marks_percentage);

    const comp = this.calculateCompletion({
      phone, dob, gender, address, city, state, category, institution_name, course, cgpa, marks_percentage
    });

    const sql = `
      UPDATE student_profiles
      SET phone = $2, dob = $3, gender = $4, address = $5, city = $6, state = $7,
          country = $8, category = $9, family_income = $10, family_size = $11,
          enrollment_no = $12, institution_name = $13, course = $14, branch = $15,
          academic_year = $16, semester = $17, cgpa = $18, passing_year = $19,
          marks_percentage = $20, profile_complete = $21, updated_at = NOW()
      WHERE user_id = $1
      RETURNING *
    `;

    await query(sql, [
      userId, phone, dob, gender, address, city, state, country, category,
      family_income, family_size, enrollment_no, institution_name, course, branch,
      academic_year, semester, cgpa, passing_year, marks_percentage, comp
    ]);

    // Also update username in users table if passed in updates
    if (updates.username) {
      await query("UPDATE users SET username = $2, updated_at = NOW() WHERE id = $1", [userId, updates.username.trim()]);
    }

    return this.findByUserId(userId);
  }

  static async getBasicInfo(userId) {
    const sql = `
      SELECT u.id, u.username, u.email, u.role, sp.enrollment_no, sp.phone, sp.institution_name, sp.course
      FROM users u
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      WHERE u.id = $1
    `;
    const res = await query(sql, [userId]);
    return res.rows[0] || null;
  }
}

module.exports = ProfileRepository;


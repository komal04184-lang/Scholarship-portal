const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const config = require('../config');
const logger = require('../config/logger');

/**
 * POST /api/v1/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, phone, password } = req.body;

    // Check duplicate email
    const existing = await pool.query(
      'SELECT student_id FROM student WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO student (name, email, password, password_hash, phone)
       VALUES ($1, $2, $3, $3, $4)
       RETURNING student_id, name, email, phone, created_at`,
      [name, email, passwordHash, phone || null]
    );

    const student = result.rows[0];

    // Create empty profile
    await pool.query(
      'INSERT INTO student_profile (student_id) VALUES ($1) ON CONFLICT (student_id) DO NOTHING',
      [student.student_id]
    );

    const token = jwt.sign(
      { id: student.student_id, email: student.email, role: 'STUDENT' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    logger.info('Student registered', { studentId: student.student_id, email: student.email });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: student.student_id,
        name: student.name,
        email: student.email,
        role: 'STUDENT',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT student_id, name, email, password, password_hash FROM student WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const student = result.rows[0];
    const hashToCompare = student.password_hash || student.password;
    const valid = await bcrypt.compare(password, hashToCompare);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: student.student_id, email: student.email, role: 'STUDENT' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    logger.info('Student logged in', { studentId: student.student_id });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: student.student_id,
        name: student.name,
        email: student.email,
        role: 'STUDENT',
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/admin/login
 */
async function adminLogin(req, res, next) {
  try {
    const { email, password } = req.body;

    // Try admin table first
    let result = await pool.query(
      'SELECT admin_id, name, email, password, password_hash, role FROM admin WHERE email = $1',
      [email]
    );

    let user = null;
    let role = 'ADMIN';

    if (result.rows.length > 0) {
      user = result.rows[0];
      role = user.role || 'ADMIN';
      const hashToCompare = user.password_hash || user.password;
      const valid = await bcrypt.compare(password, hashToCompare);
      if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

      const token = jwt.sign(
        { id: user.admin_id, email: user.email, role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      return res.json({
        message: 'Login successful',
        token,
        user: { id: user.admin_id, name: user.name, email: user.email, role },
      });
    }

    // Try reviewer table
    result = await pool.query(
      'SELECT reviewer_id, name, email, password, password_hash, department, designation, status FROM reviewer WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    user = result.rows[0];
    if (user.status === 'INACTIVE') {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const hashToCompare = user.password_hash || user.password;
    const valid = await bcrypt.compare(password, hashToCompare);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.reviewer_id, email: user.email, role: 'REVIEWER', designation: user.designation },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.reviewer_id,
        name: user.name,
        email: user.email,
        role: 'REVIEWER',
        designation: user.designation,
        department: user.department,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/me
 */
async function getMe(req, res, next) {
  try {
    if (req.user.role === 'STUDENT') {
      const result = await pool.query(
        `SELECT s.student_id, s.name, s.email, s.phone, s.date_of_birth, s.gender, s.address, s.created_at,
                sp.category, sp.annual_income, sp.family_size, sp.state, sp.city
         FROM student s
         LEFT JOIN student_profile sp ON s.student_id = sp.student_id
         WHERE s.student_id = $1`,
        [req.user.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: { ...result.rows[0], role: 'STUDENT' } });
    }

    if (req.user.role === 'ADMIN') {
      const result = await pool.query(
        'SELECT admin_id, name, email, role FROM admin WHERE admin_id = $1',
        [req.user.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: { ...result.rows[0], role: 'ADMIN' } });
    }

    if (req.user.role === 'REVIEWER') {
      const result = await pool.query(
        'SELECT reviewer_id, name, email, department, designation FROM reviewer WHERE reviewer_id = $1',
        [req.user.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: { ...result.rows[0], role: 'REVIEWER' } });
    }

    res.status(400).json({ error: 'Unknown role' });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, adminLogin, getMe };

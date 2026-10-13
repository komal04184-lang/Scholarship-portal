const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const StudentModel = require('../models/studentModel');
const ApplicationModel = require('../models/applicationModel');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_k9x2m4p7';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class StudentController {
  static async register(req, res, next) {
    try {
      const {
        name,
        email,
        password,
        confirmPassword,
        phone,
        date_of_birth,
        gender,
        address,
        category,
        annual_income,
        family_size,
        state,
        city,
        institution_name,
        course,
        branch,
        semester,
        cgpa,
        passing_year,
      } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' });
      }

      if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match' });
      }

      const existing = await StudentModel.findByEmail(email.trim());
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const hash = await bcrypt.hash(password, 10);
      const student = await StudentModel.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        passwordHash: hash,
        phone: phone || null,
        date_of_birth: date_of_birth || null,
        gender: gender || null,
        address: address || null,
      });

      // Initialize profile
      await StudentModel.upsertProfile(student.student_id, {
        category: category || null,
        annual_income: annual_income ? parseFloat(annual_income) : null,
        family_size: family_size ? parseInt(family_size, 10) : null,
        state: state || null,
        city: city || null,
      });

      // Initialize academic details if provided
      if (institution_name || course || branch || cgpa) {
        await StudentModel.addAcademicDetails(student.student_id, {
          institution_name: institution_name || null,
          course: course || null,
          branch: branch || null,
          semester: semester ? parseInt(semester, 10) : 1,
          cgpa: cgpa ? parseFloat(cgpa) : null,
          passing_year: passing_year ? parseInt(passing_year, 10) : null,
        });
      }

      const token = jwt.sign(
        { id: student.student_id, email: student.email, role: 'STUDENT' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

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

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const student = await StudentModel.findByEmail(email.trim().toLowerCase());
      if (!student) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const hashToCompare = student.password_hash || student.password;
      const valid = await bcrypt.compare(password, hashToCompare);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: student.student_id, email: student.email, role: 'STUDENT' },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

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

  static async getProfile(req, res, next) {
    try {
      const studentId = req.user.id;
      const student = await StudentModel.findById(studentId);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const profile = (await StudentModel.getProfile(studentId)) || {};
      const academics = await StudentModel.getAcademicDetails(studentId);

      res.json({
        profile: {
          student_id: student.student_id,
          name: student.name,
          email: student.email,
          phone: student.phone,
          date_of_birth: student.date_of_birth,
          gender: student.gender,
          address: student.address,
          created_at: student.created_at,
          category: profile.category || null,
          annual_income: profile.annual_income || null,
          family_size: profile.family_size || null,
          state: profile.state || null,
          city: profile.city || null,
          academics,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const studentId = req.user.id;
      const { name, phone, address, gender, date_of_birth, category, annual_income, family_size, state, city, cgpa, course, branch, semester, institution_name, passing_year } = req.body;

      // Update student table
      await StudentModel.update(studentId, { name, phone, address, gender, date_of_birth });

      // Update student_profile table
      const updatedProfile = await StudentModel.upsertProfile(studentId, {
        category,
        annual_income: annual_income ? parseFloat(annual_income) : null,
        family_size: family_size ? parseInt(family_size, 10) : null,
        state,
        city,
      });

      // Update academic_details if academic data provided
      if (cgpa || course || branch || semester || institution_name || passing_year) {
        await StudentModel.updateAcademicDetails(studentId, {
          institution_name,
          course,
          branch,
          semester: semester ? parseInt(semester, 10) : null,
          cgpa: cgpa ? parseFloat(cgpa) : null,
          passing_year: passing_year ? parseInt(passing_year, 10) : null,
        });
      }

      res.json({
        message: 'Profile updated successfully',
        profile: updatedProfile,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAcademics(req, res, next) {
    try {
      const studentId = req.user.id;
      const academics = await StudentModel.getAcademicDetails(studentId);
      res.json({ academics });
    } catch (err) {
      next(err);
    }
  }

  static async addAcademics(req, res, next) {
    try {
      const studentId = req.user.id;
      const { institution_name, course, branch, semester, cgpa, passing_year } = req.body;

      const record = await StudentModel.addAcademicDetails(studentId, {
        institution_name,
        course,
        branch,
        semester: semester ? parseInt(semester, 10) : null,
        cgpa: cgpa ? parseFloat(cgpa) : null,
        passing_year: passing_year ? parseInt(passing_year, 10) : null,
      });

      res.status(201).json({ message: 'Academic record added', academic: record });
    } catch (err) {
      next(err);
    }
  }

  static async getMyApplications(req, res, next) {
    try {
      const studentId = req.user.id;
      const applications = await ApplicationModel.findByStudentId(studentId);
      res.json({ applications });
    } catch (err) {
      next(err);
    }
  }

  static async getNotifications(req, res, next) {
    try {
      const studentId = req.user.id;
      const notifs = await query(
        `SELECT * FROM notification WHERE student_id = $1 ORDER BY created_at DESC LIMIT 50`,
        [studentId]
      );
      res.json({ notifications: notifs.rows });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = StudentController;

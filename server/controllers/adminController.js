const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const ScholarshipModel = require('../models/scholarshipModel');
const ApplicationModel = require('../models/applicationModel');
const ApplicationService = require('../services/applicationService');
const StudentModel = require('../models/studentModel');
const ReviewerModel = require('../models/reviewerModel');
const PaymentModel = require('../models/paymentModel');
const PaymentService = require('../services/paymentService');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_in_production_k9x2m4p7';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class AdminController {
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Check admin table
      let result = await query(
        `SELECT admin_id as id, name, email, password, password_hash, role FROM admin WHERE email = $1`,
        [email.trim().toLowerCase()]
      );

      let user = null;
      let role = 'ADMIN';

      if (result.rows.length > 0) {
        user = result.rows[0];
        role = user.role || 'ADMIN';
      } else {
        // Fallback to reviewer table
        const rev = await ReviewerModel.findByEmail(email.trim().toLowerCase());
        if (rev) {
          user = {
            id: rev.reviewer_id,
            name: rev.name,
            email: rev.email,
            password: rev.password,
            password_hash: rev.password_hash,
            role: 'REVIEWER',
          };
          role = 'REVIEWER';
        }
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const hashToCompare = user.password_hash || user.password;
      const valid = await bcrypt.compare(password, hashToCompare);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getDashboard(req, res, next) {
    try {
      const stats = await query(`
        SELECT
          (SELECT COUNT(*) FROM student) as total_students,
          (SELECT COUNT(*) FROM scholarship) as total_scholarships,
          (SELECT COUNT(*) FROM scholarship WHERE status = 'ACTIVE') as active_scholarships,
          (SELECT COUNT(*) FROM application) as total_applications,
          (SELECT COUNT(*) FROM application WHERE status IN ('SUBMITTED','UNDER_REVIEW')) as pending_applications,
          (SELECT COUNT(*) FROM application WHERE status = 'APPROVED') as approved_applications,
          (SELECT COUNT(*) FROM application WHERE status = 'REJECTED') as rejected_applications,
          (SELECT COUNT(*) FROM application_document WHERE verification_status = 'PENDING') as pending_documents,
          (SELECT COUNT(*) FROM payment WHERE payment_status = 'SUCCESS' OR status = 'SUCCESS') as successful_payments,
          (SELECT COALESCE(SUM(amount), 0) FROM payment WHERE payment_status = 'SUCCESS' OR status = 'SUCCESS') as total_disbursed
      `);

      const statusDist = await query(`SELECT status, COUNT(*) as count FROM application GROUP BY status`);

      const recentApps = await query(`
        SELECT a.application_id, a.status, a.submitted_at,
               s.name as student_name, sch.name as scholarship_name
        FROM application a
        JOIN student s ON a.student_id = s.student_id
        JOIN scholarship sch ON a.scholarship_id = sch.scholarship_id
        ORDER BY a.updated_at DESC LIMIT 10
      `);

      res.json({
        stats: stats.rows[0],
        statusDistribution: statusDist.rows,
        recentApplications: recentApps.rows,
      });
    } catch (err) {
      next(err);
    }
  }

  // Scholarships
  static async getAllScholarships(req, res, next) {
    try {
      const { search, status, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const result = await ScholarshipModel.findAll({
        search,
        status,
        limit: parseInt(limit, 10),
        offset,
      });

      res.json({
        scholarships: result.scholarships,
        pagination: {
          total: result.total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async createScholarship(req, res, next) {
    try {
      const { name, description, amount, status, deadline } = req.body;
      if (!name || !amount) {
        return res.status(400).json({ error: 'Name and amount are required' });
      }

      const sch = await ScholarshipModel.create({
        name,
        description,
        amount: parseFloat(amount),
        status: status || 'ACTIVE',
        deadline,
      });

      res.status(201).json({ message: 'Scholarship created successfully', scholarship: sch });
    } catch (err) {
      next(err);
    }
  }

  static async updateScholarship(req, res, next) {
    try {
      const { id } = req.params;
      const { name, description, amount, status, deadline } = req.body;

      const sch = await ScholarshipModel.update(id, {
        name,
        description,
        amount: amount ? parseFloat(amount) : undefined,
        status,
        deadline,
      });

      if (!sch) {
        return res.status(404).json({ error: 'Scholarship not found' });
      }

      res.json({ message: 'Scholarship updated successfully', scholarship: sch });
    } catch (err) {
      next(err);
    }
  }

  static async upsertEligibilityCriteria(req, res, next) {
    try {
      const { id } = req.params;
      const { minimum_cgpa, maximum_income, eligible_course, eligible_category, minimum_age, maximum_age } = req.body;

      const criteria = await ScholarshipModel.upsertEligibilityCriteria(id, {
        minimum_cgpa: minimum_cgpa !== undefined ? parseFloat(minimum_cgpa) : null,
        maximum_income: maximum_income !== undefined ? parseFloat(maximum_income) : null,
        eligible_course,
        eligible_category,
        minimum_age: minimum_age !== undefined ? parseInt(minimum_age, 10) : null,
        maximum_age: maximum_age !== undefined ? parseInt(maximum_age, 10) : null,
      });

      res.json({ message: 'Eligibility criteria updated', criteria });
    } catch (err) {
      next(err);
    }
  }

  static async addRequiredDocument(req, res, next) {
    try {
      const { id } = req.params;
      const { document_name, mandatory } = req.body;

      const doc = await ScholarshipModel.addRequiredDocument(id, {
        document_name,
        mandatory: mandatory !== false,
      });

      res.status(201).json({ message: 'Required document added', document: doc });
    } catch (err) {
      next(err);
    }
  }

  static async deleteRequiredDocument(req, res, next) {
    try {
      const { docId } = req.params;
      const deleted = await ScholarshipModel.deleteRequiredDocument(docId);
      if (!deleted) {
        return res.status(404).json({ error: 'Document requirement not found' });
      }
      res.json({ message: 'Required document deleted' });
    } catch (err) {
      next(err);
    }
  }

  // Applications
  static async getAllApplications(req, res, next) {
    try {
      const { search, status, scholarship_id, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const result = await ApplicationModel.findAll({
        search,
        status,
        scholarshipId: scholarship_id,
        limit: parseInt(limit, 10),
        offset,
      });

      res.json({
        applications: result.applications,
        pagination: {
          total: result.total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async changeApplicationStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, comment, reviewer_id } = req.body;

      const result = await ApplicationService.changeStatus({
        applicationId: id,
        newStatus: status,
        comment,
        changedBy: `${req.user.role}:${req.user.id}`,
        reviewerId: reviewer_id || null,
      });

      res.json({ message: `Application status updated to ${status}`, result });
    } catch (err) {
      next(err);
    }
  }

  static async assignReviewer(req, res, next) {
    try {
      const { id } = req.params;
      const { reviewer_id } = req.body;

      const reviewer = await ReviewerModel.findById(reviewer_id);
      if (!reviewer) {
        return res.status(404).json({ error: 'Reviewer not found' });
      }

      await query(
        `UPDATE application SET reviewer_id = $1, updated_at = NOW() WHERE application_id = $2`,
        [reviewer_id, id]
      );

      res.json({ message: `Reviewer ${reviewer.name} assigned successfully` });
    } catch (err) {
      next(err);
    }
  }

  // Students
  static async getAllStudents(req, res, next) {
    try {
      const { search, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const result = await StudentModel.findAll({
        search,
        limit: parseInt(limit, 10),
        offset,
      });

      res.json({
        students: result.students,
        pagination: {
          total: result.total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getStudentDetails(req, res, next) {
    try {
      const { id } = req.params;
      const student = await StudentModel.findById(id);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const profile = await StudentModel.getProfile(id);
      const academics = await StudentModel.getAcademicDetails(id);
      const applications = await ApplicationModel.findByStudentId(id);

      res.json({
        student,
        profile,
        academics,
        applications,
      });
    } catch (err) {
      next(err);
    }
  }

  // Reviewers
  static async getAllReviewers(req, res, next) {
    try {
      const reviewers = await ReviewerModel.findAll();
      res.json({ reviewers });
    } catch (err) {
      next(err);
    }
  }

  static async createReviewer(req, res, next) {
    try {
      const { name, email, password, department, designation } = req.body;
      const existing = await ReviewerModel.findByEmail(email);
      if (existing) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      const hash = await bcrypt.hash(password || 'Review@1234', 10);
      const reviewer = await ReviewerModel.create({
        name,
        email,
        password: password || 'Review@1234',
        passwordHash: hash,
        department,
        designation,
      });

      res.status(201).json({ message: 'Reviewer created successfully', reviewer });
    } catch (err) {
      next(err);
    }
  }

  // Payments
  static async getAllPayments(req, res, next) {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

      const result = await PaymentModel.findAll({
        status,
        limit: parseInt(limit, 10),
        offset,
      });

      res.json({
        payments: result.payments,
        pagination: {
          total: result.total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async createPayment(req, res, next) {
    try {
      const { application_id, amount, transaction_id, payment_date, payment_status } = req.body;

      const payment = await PaymentService.disbursePayment({
        applicationId: application_id,
        amount: amount ? parseFloat(amount) : null,
        transactionId: transaction_id,
        paymentDate: payment_date,
        paymentStatus: payment_status || 'SUCCESS',
      });

      res.status(201).json({ message: 'Disbursement recorded successfully', payment });
    } catch (err) {
      next(err);
    }
  }

  static async updatePaymentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { payment_status } = req.body;

      const payment = await PaymentService.updatePaymentStatus(id, payment_status);
      res.json({ message: 'Payment status updated', payment });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AdminController;

const path = require('path');
const fs = require('fs');
const ApplicationService = require('../services/applicationService');
const { testConnection: testPgConnection } = require('../config/database');
const { testConnection: testMongoConnection } = require('../config/mongodb');
const config = require('../config');

class ApplicationController {
  /**
   * Health endpoint: reports service health and database connections
   */
  static async getHealth(req, res) {
    const [pgStatus, mongoStatus] = await Promise.all([
      testPgConnection(),
      testMongoConnection(),
    ]);

    const isHealthy = pgStatus.connected;
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      service: 'application-service',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      dependencies: {
        postgres: pgStatus,
        mongodb: mongoStatus,
        student_service_url: config.services.studentServiceUrl,
        scholarship_service_url: config.services.scholarshipServiceUrl,
      },
    });
  }

  /**
   * Submit new application
   */
  static async submitApplication(req, res, next) {
    try {
      const studentId = req.user.id;
      const { scholarship_id, statement, sop, annual_income, cgpa, academic_details, custom_answers } = req.body;

      const result = await ApplicationService.submitApplication({
        studentId,
        scholarshipId: parseInt(scholarship_id, 10),
        statement,
        sop,
        userContext: {
          annual_income,
          cgpa,
          academic_details,
          custom_answers,
        },
        token: req.user.rawToken,
      });

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        application: result.application,
        scholarship: result.scholarship,
        status: result.status,
        ...(result.warning ? { warning: result.warning } : {}),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get applications of the logged in student
   */
  static async getMyApplications(req, res, next) {
    try {
      const studentId = req.user.id;
      const applications = await ApplicationService.getStudentApplications(studentId);
      res.json({
        success: true,
        applications,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get application details by ID
   */
  static async getApplicationById(req, res, next) {
    try {
      const { id } = req.params;
      const details = await ApplicationService.getApplicationById(id);
      res.json({
        success: true,
        ...details,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Track application progress and status timeline
   */
  static async trackApplication(req, res, next) {
    try {
      const { id } = req.params;
      const tracking = await ApplicationService.trackApplication(id);
      res.json({
        success: true,
        tracking,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Get status history
   */
  static async getStatusHistory(req, res, next) {
    try {
      const { id } = req.params;
      const history = await ApplicationService.trackApplication(id);
      res.json({
        success: true,
        application_id: id,
        history: history.timeline,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update application statement / SOP
   */
  static async updateApplication(req, res, next) {
    try {
      const { id } = req.params;
      const studentId = req.user.id;
      const updated = await ApplicationService.updateApplication(id, studentId, req.body);
      res.json({
        success: true,
        message: 'Application updated successfully',
        application: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Update application status (Admin/Reviewer)
   */
  static async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, comment, reviewer_id } = req.body;
      const changedBy = req.user.role || 'ADMIN';
      const reviewerId = reviewer_id || (req.user.role === 'REVIEWER' ? req.user.id : null);

      const result = await ApplicationService.updateStatus(id, {
        newStatus: status,
        comment,
        changedBy,
        reviewerId,
      });

      res.json({
        success: true,
        message: `Application status updated to ${status}`,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List all applications (Admin/Reviewer)
   */
  static async getAllApplications(req, res, next) {
    try {
      const { status, scholarship_id, search, limit, offset } = req.query;
      const result = await ApplicationService.getAllApplications({
        status,
        scholarshipId: scholarship_id ? parseInt(scholarship_id, 10) : undefined,
        search,
        limit: parseInt(limit, 10) || 20,
        offset: parseInt(offset, 10) || 0,
      });

      res.json({
        success: true,
        total: result.total,
        applications: result.applications,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Upload document attachment
   */
  static async uploadDocument(req, res, next) {
    try {
      const { id } = req.params;
      const { requirement_id, document_name } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded. Please provide a file field named "document".',
        });
      }

      const doc = await ApplicationService.uploadDocument({
        applicationId: id,
        requirementId: requirement_id ? parseInt(requirement_id, 10) : 1,
        file: req.file,
        documentName: document_name || req.file.originalname,
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        document: doc,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * List documents for an application
   */
  static async getDocuments(req, res, next) {
    try {
      const { id } = req.params;
      const details = await ApplicationService.getApplicationById(id);
      res.json({
        success: true,
        documents: details.documents,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Download a document
   */
  static async downloadDocument(req, res, next) {
    try {
      const { id, docId } = req.params;
      const doc = await ApplicationService.getDocumentForDownload(docId);

      // Verify file matches application
      if (String(doc.application_id) !== String(id)) {
        return res.status(400).json({ success: false, error: 'Document does not belong to this application' });
      }

      // Check student ownership if role is STUDENT
      if (req.user.role === 'STUDENT' && String(doc.student_id) !== String(req.user.id)) {
        return res.status(403).json({ success: false, error: 'Access denied: You do not own this document.' });
      }

      const uploadRoot = path.resolve(process.cwd(), config.upload.dir);
      const filePath = path.join(uploadRoot, doc.document_path);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'Document file not found on disk storage.' });
      }

      res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.original_name)}"`);
      // sendFile with root option avoids Windows path issues with drive letters
      res.sendFile(doc.document_path, {
        root: uploadRoot,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Verify document (Admin/Reviewer)
   */
  static async verifyDocument(req, res, next) {
    try {
      const { docId } = req.params;
      const { verification_status, reviewer_comment } = req.body;
      const verifiedBy = req.user.id;

      const updated = await ApplicationService.verifyDocument(docId, {
        verificationStatus: verification_status,
        reviewerComment: reviewer_comment,
        verifiedBy,
      });

      res.json({
        success: true,
        message: `Document verification updated to ${verification_status}`,
        document: updated,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ApplicationController;


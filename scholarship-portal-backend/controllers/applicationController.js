const ApplicationModel = require('../models/applicationModel');
const ApplicationService = require('../services/applicationService');
const DocumentModel = require('../models/documentModel');
const DocumentService = require('../services/documentService');
const PaymentModel = require('../models/paymentModel');
const StudentModel = require('../models/studentModel');
const ScholarshipModel = require('../models/scholarshipModel');

class ApplicationController {
  static async submitApplication(req, res, next) {
    try {
      const studentId = req.user.id;
      const { scholarship_id, statement, sop } = req.body;

      if (!scholarship_id) {
        return res.status(400).json({ error: 'scholarship_id is required' });
      }

      const application = await ApplicationService.submitApplication({
        studentId,
        scholarshipId: parseInt(scholarship_id, 10),
        statement: statement || sop,
        sop: sop || statement,
      });

      res.status(201).json({
        message: 'Application submitted successfully',
        application,
      });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({
          error: err.message,
          existing_application_id: err.existing_application_id,
        });
      }
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

  static async getApplicationById(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      const isAdmin = user.role === 'ADMIN' || user.role === 'REVIEWER';

      const application = await ApplicationModel.findById(id);
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }

      // Check ownership if student
      if (!isAdmin && application.student_id !== user.id) {
        return res.status(403).json({ error: 'Access denied to this application' });
      }

      const [statusHistory, documents, payments, requiredDocs, academics] = await Promise.all([
        ApplicationModel.getStatusHistory(id),
        DocumentModel.findByApplicationId(id),
        PaymentModel.findByApplicationId(id),
        ScholarshipModel.getRequiredDocuments(application.scholarship_id),
        isAdmin ? StudentModel.getAcademicDetails(application.student_id) : Promise.resolve([]),
      ]);

      res.json({
        application,
        statusHistory,
        documents,
        payments,
        requiredDocuments: requiredDocs,
        academics,
      });
    } catch (err) {
      next(err);
    }
  }

  static async uploadDocument(req, res, next) {
    try {
      const { id } = req.params;
      const { requirement_id } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const app = await ApplicationModel.findById(id);
      if (!app) {
        return res.status(404).json({ error: 'Application not found' });
      }

      if (req.user.role === 'STUDENT' && app.student_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const doc = await DocumentService.uploadDocument({
        applicationId: id,
        requirementId: requirement_id || 1,
        file: req.file,
      });

      res.status(201).json({
        message: 'Document uploaded successfully',
        document: doc,
      });
    } catch (err) {
      next(err);
    }
  }

  static async downloadDocument(req, res, next) {
    try {
      const { id, docId } = req.params;
      const user = req.user;
      const isAdmin = user.role === 'ADMIN' || user.role === 'REVIEWER';

      const fileInfo = await DocumentService.getFilePath(docId);
      if (req.user.role === 'STUDENT' && fileInfo.doc.student_id !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.originalName}"`);
      res.sendFile(fileInfo.filePath);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ApplicationController;

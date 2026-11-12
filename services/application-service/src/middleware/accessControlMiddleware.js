const { query } = require('../config/database');

/**
 * Ensures student can only access applications they own.
 * Admins and Reviewers have full read/review access.
 */
function requireApplicationOwnership(options = { allowAdminReviewer: true }) {
  return async (req, res, next) => {
    try {
      const applicationId = req.params.id || req.params.applicationId;
      if (!applicationId) {
        return res.status(400).json({ success: false, error: 'Application ID is required' });
      }

      const resApp = await query('SELECT * FROM application WHERE application_id = $1', [applicationId]);
      if (resApp.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Application not found' });
      }

      const application = resApp.rows[0];
      req.application = application;

      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const isElevated = user.role === 'ADMIN' || user.role === 'REVIEWER';
      if (options.allowAdminReviewer && isElevated) {
        return next();
      }

      // Check student ownership
      if (String(application.student_id) !== String(user.id)) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You do not have permission to access or modify this application.',
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  requireApplicationOwnership,
};


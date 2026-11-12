const Joi = require('joi');

const validStatuses = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'DOCUMENTS_REQUIRED',
  'RESUBMISSION_REQUIRED',
  'CORRECTION_REQUIRED',
  'APPROVED',
  'REJECTED',
  'PAYMENT_PENDING',
  'COMPLETED',
  'DISBURSED',
  'WITHDRAWN',
];

const submitApplicationSchema = Joi.object({
  scholarship_id: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().trim().min(1)
  ).required().messages({
    'any.required': 'scholarship_id is required',
  }),
  statement: Joi.string().trim().min(10).max(5000),
  sop: Joi.string().trim().min(10).max(5000),
  academic_year: Joi.string().trim().max(32).default('2026-2027'),
  academic_details: Joi.object({
    institution_name: Joi.string().trim(),
    course: Joi.string().trim(),
    branch: Joi.string().trim(),
    academic_year: Joi.string().trim(),
    marks_percentage: Joi.number().min(0).max(100),
  }).optional(),
  metadata: Joi.object().optional(),
}).or('statement', 'sop').messages({
  'object.missing': 'Either statement or statement of purpose (sop) must be provided with at least 10 characters',
});

const updateApplicationSchema = Joi.object({
  statement: Joi.string().trim().min(10).max(5000),
  sop: Joi.string().trim().min(10).max(5000),
  academic_year: Joi.string().trim().max(32),
  metadata: Joi.object().optional(),
}).or('statement', 'sop', 'academic_year', 'metadata').messages({
  'object.missing': 'At least one field (statement, sop, or academic_year) must be provided for update',
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid(...validStatuses).required().messages({
    'any.required': 'New status is required',
    'any.only': `Status must be one of: ${validStatuses.join(', ')}`,
  }),
  comment: Joi.string().trim().max(1000).allow('', null),
  remarks: Joi.string().trim().max(1000).allow('', null),
});

const withdrawApplicationSchema = Joi.object({
  remarks: Joi.string().trim().max(1000).default('Withdrawn by applicant'),
  comment: Joi.string().trim().max(1000).optional(),
});

const queryApplicationsSchema = Joi.object({
  status: Joi.string().valid(...validStatuses).optional(),
  scholarship_id: Joi.alternatives().try(Joi.number().integer(), Joi.string().trim()).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('DESC'),
});

module.exports = {
  validStatuses,
  submitApplicationSchema,
  updateApplicationSchema,
  updateStatusSchema,
  withdrawApplicationSchema,
  queryApplicationsSchema,
};


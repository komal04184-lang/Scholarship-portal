const Joi = require('joi');

const submitApplicationSchema = Joi.object({
  scholarship_id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).required().messages({
    'any.required': 'scholarship_id is required',
  }),
  statement: Joi.string().trim().max(5000).allow('', null),
  sop: Joi.string().trim().max(5000).allow('', null),
  annual_income: Joi.number().min(0).allow(null),
  cgpa: Joi.number().min(0).max(10).allow(null),
  academic_details: Joi.object().unknown(true).optional(),
  custom_answers: Joi.object().unknown(true).optional(),
}).or('statement', 'sop').messages({
  'object.missing': 'Either statement or sop must be provided',
});

const updateApplicationSchema = Joi.object({
  statement: Joi.string().trim().max(5000).allow('', null),
  sop: Joi.string().trim().max(5000).allow('', null),
  custom_answers: Joi.object().unknown(true).optional(),
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED', 'DISBURSED')
    .required()
    .messages({
      'any.only': 'Invalid status. Must be SUBMITTED, UNDER_REVIEW, CORRECTION_REQUIRED, APPROVED, REJECTED, or DISBURSED.',
    }),
  comment: Joi.string().trim().max(1000).allow('', null),
  reviewer_id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).allow(null),
});

const queryApplicationsSchema = Joi.object({
  status: Joi.string().valid('ALL', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED', 'DISBURSED').default('ALL'),
  scholarship_id: Joi.alternatives().try(Joi.number().integer().positive(), Joi.string()).optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
  search: Joi.string().trim().max(100).allow('', null),
});

const verifyDocumentSchema = Joi.object({
  verification_status: Joi.string().valid('VERIFIED', 'REJECTED').required(),
  reviewer_comment: Joi.string().trim().max(1000).allow('', null),
});

module.exports = {
  submitApplicationSchema,
  updateApplicationSchema,
  updateStatusSchema,
  queryApplicationsSchema,
  verifyDocumentSchema,
};


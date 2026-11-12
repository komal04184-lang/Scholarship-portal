const Joi = require('joi');

const uploadDocumentSchema = Joi.object({
  requirement_id: Joi.alternatives().try(Joi.number().integer(), Joi.string().trim()).optional(),
  document_id: Joi.alternatives().try(Joi.number().integer(), Joi.string().trim()).optional(),
  document_name: Joi.string().trim().max(300).optional(),
  document_type: Joi.string().trim().max(100).optional(),
});

const verifyDocumentSchema = Joi.object({
  verification_status: Joi.string().valid('PENDING', 'VERIFIED', 'REJECTED').required().messages({
    'any.required': 'verification_status is required',
    'any.only': 'verification_status must be PENDING, VERIFIED, or REJECTED',
  }),
  comment: Joi.string().trim().max(1000).allow('', null),
  reviewer_comment: Joi.string().trim().max(1000).allow('', null),
});

module.exports = {
  uploadDocumentSchema,
  verifyDocumentSchema,
};


const Joi = require('joi');

const uploadDocumentSchema = Joi.object({
  requirement_id: Joi.alternatives()
    .try(Joi.number().integer(), Joi.string().trim().allow(''))
    .optional()
    .allow(null, ''),
  document_id: Joi.alternatives()
    .try(Joi.number().integer(), Joi.string().trim().allow(''))
    .optional()
    .allow(null, ''),
  document_name: Joi.string().trim().max(300).optional().allow('', null),
  document_type: Joi.string().trim().max(100).optional().allow('', null),
});

const verifyDocumentSchema = Joi.object({
  verification_status: Joi.string().valid('PENDING', 'VERIFIED', 'REJECTED').optional(),
  status: Joi.string().valid('PENDING', 'VERIFIED', 'REJECTED').optional(),
  comment: Joi.string().trim().max(1000).allow('', null),
  reviewer_comment: Joi.string().trim().max(1000).allow('', null),
}).or('verification_status', 'status').messages({
  'object.missing': 'Either verification_status or status must be provided with value PENDING, VERIFIED, or REJECTED',
});

module.exports = {
  uploadDocumentSchema,
  verifyDocumentSchema,
};


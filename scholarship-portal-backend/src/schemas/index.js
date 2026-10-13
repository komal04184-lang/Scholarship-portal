const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  email: Joi.string().email().max(255).required(),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).allow('', null),
  password: Joi.string().min(8).max(100).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
    .messages({ 'any.only': 'Passwords do not match' }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const profileSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  phone: Joi.string().pattern(/^[0-9]{10,15}$/).allow('', null),
  date_of_birth: Joi.string().isoDate().allow('', null),
  gender: Joi.string().valid('Male', 'Female', 'Other').allow('', null),
  address: Joi.string().max(500).allow('', null),
  category: Joi.string().valid('General', 'OBC', 'SC', 'ST', 'EWS').allow('', null),
  annual_income: Joi.number().min(0).allow(null),
  family_size: Joi.number().integer().min(1).max(20).allow(null),
  state: Joi.string().max(100).allow('', null),
  city: Joi.string().max(100).allow('', null),
});

const academicSchema = Joi.object({
  institution_name: Joi.string().max(300).required(),
  course: Joi.string().max(100).required(),
  branch: Joi.string().max(100).allow('', null),
  semester: Joi.number().integer().min(1).max(12).required(),
  cgpa: Joi.number().min(0).max(10).required(),
  passing_year: Joi.number().integer().min(1990).max(2040).required(),
});

const scholarshipSchema = Joi.object({
  name: Joi.string().min(3).max(300).required(),
  description: Joi.string().max(5000).allow('', null),
  amount: Joi.number().min(1).required(),
  status: Joi.string().valid('ACTIVE', 'CLOSED', 'DRAFT').default('ACTIVE'),
  deadline: Joi.string().isoDate().required(),
});

const eligibilityCriteriaSchema = Joi.object({
  minimum_cgpa: Joi.number().min(0).max(10).allow(null),
  maximum_income: Joi.number().min(0).allow(null),
  eligible_course: Joi.string().max(100).allow('', null),
  eligible_category: Joi.string().valid('General', 'OBC', 'SC', 'ST', 'EWS', '').allow(null),
  minimum_age: Joi.number().integer().min(0).allow(null),
  maximum_age: Joi.number().integer().min(0).allow(null),
});

const requiredDocumentSchema = Joi.object({
  document_name: Joi.string().max(200).required(),
  mandatory: Joi.boolean().default(true),
});

const applicationSchema = Joi.object({
  scholarship_id: Joi.number().integer().required(),
  statement: Joi.string().max(2000).allow('', null),
});

const reviewerSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  email: Joi.string().email().max(255).required(),
  password: Joi.string().min(8).max(100).required(),
  department: Joi.string().max(200).allow('', null),
  designation: Joi.string().max(200).required(),
});

const reviewerUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(200),
  department: Joi.string().max(200).allow('', null),
  designation: Joi.string().max(200),
  status: Joi.string().valid('ACTIVE', 'INACTIVE'),
});

const paymentSchema = Joi.object({
  application_id: Joi.number().integer().required(),
  amount: Joi.number().min(1).required(),
  payment_status: Joi.string().valid('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED').default('PENDING'),
  transaction_id: Joi.string().max(100).required(),
  payment_date: Joi.string().isoDate().required(),
});

const paymentUpdateSchema = Joi.object({
  payment_status: Joi.string().valid('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED').required(),
});

const applicationStatusChangeSchema = Joi.object({
  status: Joi.string().valid('UNDER_REVIEW', 'CORRECTION_REQUIRED', 'APPROVED', 'REJECTED').required(),
  comment: Joi.string().max(1000).allow('', null),
  reviewer_id: Joi.number().integer().allow(null),
});

module.exports = {
  registerSchema,
  loginSchema,
  profileSchema,
  academicSchema,
  scholarshipSchema,
  eligibilityCriteriaSchema,
  requiredDocumentSchema,
  applicationSchema,
  reviewerSchema,
  reviewerUpdateSchema,
  paymentSchema,
  paymentUpdateSchema,
  applicationStatusChangeSchema,
};

const ApiResponse = require('../utils/api-response');

/**
 * Validates request body, query, or params using a Joi schema
 * @param {import('joi').ObjectSchema} schema
 * @param {'body'|'query'|'params'} [property='body']
 */
function validateRequest(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => d.message.replace(/['"]/g, ''));
      return ApiResponse.badRequest(res, details.join(', '), 'VALIDATION_ERROR', details);
    }

    req[property] = value;
    return next();
  };
}

module.exports = validateRequest;


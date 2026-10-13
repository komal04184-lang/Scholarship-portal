const Joi = require('joi');

/**
 * Validation middleware factory.
 * @param {Joi.ObjectSchema} schema - Joi schema to validate against
 * @param {string} property - Request property to validate (body, query, params)
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details });
    }

    req[property] = value;
    next();
  };
}

module.exports = { validate };

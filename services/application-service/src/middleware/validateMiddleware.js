/**
 * Joi Schema Validation Middleware
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const dataToValidate = req[source];
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => d.message.replace(/['"]/g, ''));
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details,
      });
    }

    req[source] = value;
    next();
  };
}

module.exports = validate;


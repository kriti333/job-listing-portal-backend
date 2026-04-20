const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/responseHelper');

/**
 * Validation Middleware
 * Checks for validation errors from express-validator
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors for better readability
    const formattedErrors = errors.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));

    return errorResponse(res, 400, 'Validation failed', formattedErrors);
  }

  next();
};

module.exports = validate;

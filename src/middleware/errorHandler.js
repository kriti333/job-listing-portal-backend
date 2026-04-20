const { errorResponse } = require('../utils/responseHelper');

/**
 * Global Error Handler Middleware
 * Catches all errors and sends standardized error response
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return errorResponse(res, 400, 'Validation error', errors);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return errorResponse(res, 409, `${field} already exists. Please use a different value.`);
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return errorResponse(res, 400, `Invalid ${err.path}: ${err.value}`);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 401, 'Invalid token. Please login again.');
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, 401, 'Token expired. Please login again.');
  }

  // Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, 400, 'File size too large. Maximum size is 5MB.');
    }
    return errorResponse(res, 400, `File upload error: ${err.message}`);
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return errorResponse(res, statusCode, message);
};

/**
 * 404 Not Found Handler
 */
const notFound = (req, res) => {
  return errorResponse(res, 404, `Route ${req.originalUrl} not found`);
};

module.exports = {
  errorHandler,
  notFound,
};

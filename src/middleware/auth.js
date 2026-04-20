const { verifyToken } = require('../utils/jwtUtils');
const { errorResponse } = require('../utils/responseHelper');
const User = require('../models/User');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 401, 'Authentication required. Please provide a valid token.');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);

    // Get user from database
    const user = await User.findById(decoded.id).select('-password -refreshToken');

    if (!user) {
      return errorResponse(res, 401, 'User not found. Token is invalid.');
    }

    if (!user.isActive) {
      return errorResponse(res, 403, 'Account is deactivated. Please contact support.');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return errorResponse(res, 401, 'Invalid or expired token. Please login again.');
  }
};

/**
 * Role-based Authorization Middleware
 * Restricts access based on user role
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 401, 'Authentication required.');
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        403,
        `Access denied. This endpoint requires one of these roles: ${roles.join(', ')}`
      );
    }

    next();
  };
};

/**
 * Optional Authentication
 * Attaches user if token is present, but doesn't fail if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password -refreshToken');

      if (user && user.isActive) {
        req.user = user;
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    console.log('Optional auth failed:', error.message);
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
};

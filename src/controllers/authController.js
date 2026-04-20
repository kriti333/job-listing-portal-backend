const User = require('../models/User');
const { generateTokens, verifyToken } = require('../utils/jwtUtils');
const { successResponse, errorResponse } = require('../utils/responseHelper');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse(res, 409, 'Email already registered. Please login or use a different email.');
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'job_seeker',
    });

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    // Remove sensitive data
    const userResponse = user.toJSON();

    return successResponse(res, 201, 'Account created successfully', {
      user: userResponse,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    // Check if user has a password (not OAuth user)
    if (!user.password) {
      return errorResponse(
        res,
        401,
        'This account was created using Google Sign-In. Please use "Continue with Google" to login.'
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return errorResponse(res, 401, 'Invalid email or password');
    }

    // Check if account is active
    if (!user.isActive) {
      return errorResponse(res, 403, 'Your account has been deactivated. Please contact support.');
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);

    // Save refresh token and update last login
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Remove sensitive data
    const userResponse = user.toJSON();

    return successResponse(res, 200, 'Login successful', {
      user: userResponse,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, 400, 'Refresh token is required');
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      return errorResponse(res, 401, 'Invalid or expired refresh token');
    }

    // Find user and verify stored refresh token
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return errorResponse(res, 401, 'Invalid refresh token');
    }

    // Generate new tokens
    const tokens = generateTokens(user._id, user.role);

    // Update refresh token
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return successResponse(res, 200, 'Token refreshed successfully', {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Private
 */
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    return successResponse(res, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    return successResponse(res, 200, 'User profile retrieved', user);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/auth/google
 * @desc    Google OAuth login (initiates OAuth flow)
 * @access  Public
 */
const googleAuth = (req, res) => {
  // This is handled by passport middleware
  // See routes/auth.js for implementation
};

/**
 * @route   GET /api/auth/google/callback
 * @desc    Google OAuth callback
 * @access  Public
 */
const googleAuthCallback = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);

    // Save refresh token
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Redirect to frontend with tokens
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}&refresh=${refreshToken}&role=${user.role}`;
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
  getCurrentUser,
  googleAuth,
  googleAuthCallback,
};

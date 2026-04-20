const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  getProfile,
  getUserById,
  updateProfile,
  uploadProfilePicture,
  uploadResume,
  uploadCompanyLogo,
  changePassword,
  deactivateAccount,
  updatePublicKey,
  getPublicKey,
} = require('../controllers/userController');

const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../utils/fileUpload');
const validate = require('../middleware/validate');

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticate, getProfile);

// @route   PUT /api/users/public-key
// @desc    Update user's public encryption key
// @access  Private
router.put('/public-key', authenticate, updatePublicKey);

// @route   GET /api/users/:id/public-key
// @desc    Get user's public encryption key
// @access  Private
router.get('/:id/public-key', authenticate, getPublicKey);

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', authenticate, getUserById);

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticate, updateProfile);

// @route   POST /api/users/profile/picture
// @desc    Upload profile picture
// @access  Private
router.post(
  '/profile/picture',
  authenticate,
  upload.single('profilePicture'),
  uploadProfilePicture
);

// @route   POST /api/users/profile/resume
// @desc    Upload resume
// @access  Private (Job Seeker only)
router.post(
  '/profile/resume',
  authenticate,
  authorize('job_seeker'),
  upload.single('resume'),
  uploadResume
);

// @route   POST /api/users/profile/company-logo
// @desc    Upload company logo
// @access  Private (Employer only)
router.post(
  '/profile/company-logo',
  authenticate,
  authorize('employer'),
  upload.single('companyLogo'),
  uploadCompanyLogo
);

// @route   PUT /api/users/change-password
// @desc    Change password
// @access  Private
router.put(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters'),
  ],
  validate,
  changePassword
);

// @route   DELETE /api/users/account
// @desc    Deactivate account
// @access  Private
router.delete('/account', authenticate, deactivateAccount);

module.exports = router;

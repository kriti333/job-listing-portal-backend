const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  createApplication,
  getMyApplications,
  getEmployerApplications,
  getApplicationById,
  updateApplicationStatus,
  withdrawApplication,
  scheduleInterview,
  getApplicationStats,
} = require('../controllers/applicationController');

const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const createApplicationValidation = [
  body('jobId').notEmpty().withMessage('Job ID is required'),
  body('coverLetter').optional().trim(),
];

const updateStatusValidation = [
  body('status')
    .isIn(['pending', 'viewed', 'reviewed', 'shortlisted', 'interview', 'hired', 'rejected'])
    .withMessage('Invalid status'),
  body('note').optional().trim(),
];

const scheduleInterviewValidation = [
  body('date').notEmpty().isISO8601().withMessage('Valid date is required'),
  body('time').notEmpty().withMessage('Time is required'),
  body('mode')
    .isIn(['video', 'phone', 'in-person'])
    .withMessage('Invalid interview mode'),
];

// @route   POST /api/applications
// @desc    Apply for a job
// @access  Private (Job Seeker only)
router.post(
  '/',
  authenticate,
  authorize('job_seeker'),
  createApplicationValidation,
  validate,
  createApplication
);

// @route   GET /api/applications/my-applications
// @desc    Get my applications
// @access  Private (Job Seeker only)
router.get(
  '/my-applications',
  authenticate,
  authorize('job_seeker'),
  getMyApplications
);

// @route   GET /api/applications/employer/all
// @desc    Get all applications for employer
// @access  Private (Employer only)
router.get(
  '/employer/all',
  authenticate,
  authorize('employer'),
  getEmployerApplications
);

// @route   GET /api/applications/stats
// @desc    Get application statistics
// @access  Private (Job Seeker only)
router.get('/stats', authenticate, authorize('job_seeker'), getApplicationStats);

// @route   GET /api/applications/:id
// @desc    Get application by ID
// @access  Private (Job Seeker or Employer)
router.get('/:id', authenticate, getApplicationById);

// @route   PATCH /api/applications/:id/status
// @desc    Update application status
// @access  Private (Employer only)
router.patch(
  '/:id/status',
  authenticate,
  authorize('employer'),
  updateStatusValidation,
  validate,
  updateApplicationStatus
);

// @route   PATCH /api/applications/:id/withdraw
// @desc    Withdraw application
// @access  Private (Job Seeker only)
router.patch('/:id/withdraw', authenticate, authorize('job_seeker'), withdrawApplication);

// @route   POST /api/applications/:id/schedule-interview
// @desc    Schedule interview
// @access  Private (Employer only)
router.post(
  '/:id/schedule-interview',
  authenticate,
  authorize('employer'),
  scheduleInterviewValidation,
  validate,
  scheduleInterview
);

module.exports = router;

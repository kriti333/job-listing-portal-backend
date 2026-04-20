const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();

const {
  createJob,
  getAllJobs,
  getJobById,
  getMyJobs,
  updateJob,
  deleteJob,
  updateJobStatus,
  getJobApplicants,
} = require('../controllers/jobController');

const { authenticate, authorize, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const createJobValidation = [
  body('title').trim().notEmpty().withMessage('Job title is required'),
  body('description').trim().notEmpty().withMessage('Job description is required'),
  body('requiredSkills').isArray().withMessage('Required skills must be an array'),
  body('experienceLevel')
    .isIn(['entry', 'mid', 'senior', 'lead'])
    .withMessage('Invalid experience level'),
  body('salaryRange.min').isNumeric().withMessage('Minimum salary must be a number'),
  body('salaryRange.max').isNumeric().withMessage('Maximum salary must be a number'),
  body('location').trim().notEmpty().withMessage('Location is required'),
  body('workType')
    .isIn(['remote', 'onsite', 'hybrid'])
    .withMessage('Invalid work type'),
  body('jobType')
    .isIn(['full-time', 'part-time', 'contract', 'internship'])
    .withMessage('Invalid job type'),
];

// @route   POST /api/jobs
// @desc    Create new job
// @access  Private (Employer only)
router.post(
  '/',
  authenticate,
  authorize('employer'),
  createJobValidation,
  validate,
  createJob
);

// @route   GET /api/jobs
// @desc    Get all jobs with filters
// @access  Public (with optional auth for personalization)
router.get('/', optionalAuth, getAllJobs);

// @route   GET /api/jobs/employer/my-jobs
// @desc    Get my job postings
// @access  Private (Employer only)
router.get('/employer/my-jobs', authenticate, authorize('employer'), getMyJobs);

// @route   GET /api/jobs/:id
// @desc    Get job by ID
// @access  Public
router.get('/:id', getJobById);

// @route   PUT /api/jobs/:id
// @desc    Update job
// @access  Private (Employer - own jobs only)
router.put('/:id', authenticate, authorize('employer'), updateJob);

// @route   DELETE /api/jobs/:id
// @desc    Delete job
// @access  Private (Employer - own jobs only)
router.delete('/:id', authenticate, authorize('employer'), deleteJob);

// @route   PATCH /api/jobs/:id/status
// @desc    Update job status
// @access  Private (Employer - own jobs only)
router.patch(
  '/:id/status',
  authenticate,
  authorize('employer'),
  [body('status').isIn(['draft', 'active', 'closed', 'paused']).withMessage('Invalid status')],
  validate,
  updateJobStatus
);

// @route   GET /api/jobs/:id/applicants
// @desc    Get job applicants
// @access  Private (Employer - own jobs only)
router.get('/:id/applicants', authenticate, authorize('employer'), getJobApplicants);

module.exports = router;

const express = require('express');
const router = express.Router();

const {
  getJobSeekerDashboard,
  getEmployerDashboard,
} = require('../controllers/dashboardController');

const { authenticate, authorize } = require('../middleware/auth');

// @route   GET /api/dashboard/job-seeker
// @desc    Get job seeker dashboard data
// @access  Private (Job Seeker only)
router.get('/job-seeker', authenticate, authorize('job_seeker'), getJobSeekerDashboard);

// @route   GET /api/dashboard/employer
// @desc    Get employer dashboard data
// @access  Private (Employer only)
router.get('/employer', authenticate, authorize('employer'), getEmployerDashboard);

module.exports = router;

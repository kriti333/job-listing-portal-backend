const Job = require('../models/Job');
const Application = require('../models/Application');
const Message = require('../models/Message');
const { successResponse } = require('../utils/responseHelper');

/**
 * @route   GET /api/dashboard/job-seeker
 * @desc    Get job seeker dashboard data
 * @access  Private (Job Seeker only)
 */
const getJobSeekerDashboard = async (req, res, next) => {
  try {
    // Get application statistics
    const applicationStats = await Application.aggregate([
      { $match: { jobSeeker: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      total: 0,
      pending: 0,
      viewed: 0,
      shortlisted: 0,
      interview: 0,
      hired: 0,
      rejected: 0,
    };

    applicationStats.forEach((stat) => {
      stats[stat._id] = stat.count;
      stats.total += stat.count;
    });

    // Get recent applications
    const recentApplications = await Application.find({ jobSeeker: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('job', 'title companyName location');

    // Filter out applications with null job references (deleted jobs)
    const validRecentApplications = recentApplications.filter(app => app.job);

    // Get unread messages count
    const unreadMessages = await Message.getUnreadCount(req.user._id);

    // Get profile completion
    const profileCompletion = req.user.profileCompletion || 20;

    // Get recommended jobs based on skills
    const recommendedJobs = await Job.find({
      status: 'active',
      requiredSkills: { $in: req.user.skills || [] },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title companyName location salaryRange');

    const dashboard = {
      stats,
      recentApplications: validRecentApplications,
      unreadMessages,
      profileCompletion,
      recommendedJobs,
    };

    return successResponse(res, 200, 'Dashboard data retrieved', dashboard);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/dashboard/employer
 * @desc    Get employer dashboard data
 * @access  Private (Employer only)
 */
const getEmployerDashboard = async (req, res, next) => {
  try {
    // Get total jobs posted
    const totalJobs = await Job.countDocuments({ employer: req.user._id });

    // Get active jobs
    const activeJobs = await Job.countDocuments({
      employer: req.user._id,
      status: 'active',
    });

    // Get total applications across all jobs
    const totalApplications = await Application.countDocuments({
      employer: req.user._id,
    });

    // Get applications by status
    const applicationStats = await Application.aggregate([
      { $match: { employer: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = {
      pending: 0,
      viewed: 0,
      shortlisted: 0,
      interview: 0,
      hired: 0,
      rejected: 0,
    };

    applicationStats.forEach((stat) => {
      stats[stat._id] = stat.count;
    });

    // Get recent applications
    const recentApplications = await Application.find({
      employer: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('jobSeeker', 'name email profilePicture')
      .populate('job', 'title');

    // Filter out applications with null references (deleted users/jobs)
    const validRecentApplications = recentApplications.filter(
      app => app.jobSeeker && app.job
    );

    // Get jobs with most applications
    const topJobs = await Application.aggregate([
      { $match: { employer: req.user._id } },
      {
        $group: {
          _id: '$job',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'jobs',
          localField: '_id',
          foreignField: '_id',
          as: 'job',
        },
      },
      { $unwind: '$job' },
      {
        $project: {
          title: '$job.title',
          applicants: '$count',
        },
      },
    ]);

    // Get unread messages
    const unreadMessages = await Message.getUnreadCount(req.user._id);

    // Get scheduled interviews
    const scheduledInterviews = await Application.countDocuments({
      employer: req.user._id,
      'interview.scheduled': true,
      'interview.date': { $gte: new Date() },
    });

    const dashboard = {
      totalJobs,
      activeJobs,
      totalApplications,
      stats,
      recentApplications: validRecentApplications,
      topJobs,
      unreadMessages,
      scheduledInterviews,
    };

    return successResponse(res, 200, 'Dashboard data retrieved', dashboard);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getJobSeekerDashboard,
  getEmployerDashboard,
};

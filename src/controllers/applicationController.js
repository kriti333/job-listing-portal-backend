const Application = require('../models/Application');
const Job = require('../models/Job');
const Message = require('../models/Message');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');

const createApplicationNotification = async ({ application, title, note, type = 'status_update', sender, receiver }) => {
  try {
    await Message.create({
      sender: sender || application.employer,
      receiver: receiver || application.jobSeeker,
      content: note,
      type,
      job: application.job,
      application: application._id,
    });
  } catch (error) {
    console.error('Failed to create application notification message:', error);
  }
};

/**
 * @route   POST /api/applications
 * @desc    Apply for a job
 * @access  Private (Job Seeker only)
 */
const createApplication = async (req, res, next) => {
  try {
    const { jobId, coverLetter } = req.body;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    if (job.status !== 'active') {
      return errorResponse(res, 400, 'This job is no longer accepting applications');
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      job: jobId,
      jobSeeker: req.user.id,
    });

    if (existingApplication) {
      return errorResponse(res, 409, 'You have already applied for this job');
    }

    // Create application
    const application = await Application.create({
      job: jobId,
      jobSeeker: req.user.id,
      employer: job.employer,
      coverLetter,
      resume: req.user.resume,
      timeline: [
        {
          status: 'pending',
          timestamp: new Date(),
          note: 'Application submitted',
        },
      ],
    });

    // Calculate ATS score
    await application.populate('job jobSeeker');
    await application.calculateATSScore();
    await application.save();

    // Increment job applications count
    await job.incrementApplications();

    return successResponse(res, 201, 'Application submitted successfully', application);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/applications/my-applications
 * @desc    Get all applications by current job seeker
 * @access  Private (Job Seeker only)
 */
const getMyApplications = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { jobSeeker: req.user.id };
    if (status) {
      filter.status = status;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const totalItems = await Application.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limitNum);

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip)
      .populate('job', 'title companyName location salaryRange jobType workType status')
      .populate('employer', 'name email companyName');

    // Filter out applications with null references (deleted jobs/employers)
    const validApplications = applications.filter(app => app.job && app.employer);

    return paginatedResponse(res, 200, 'Your applications retrieved successfully', validApplications, {
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalItems,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/applications/:id
 * @desc    Get single application by ID
 * @access  Private (Job Seeker or Employer)
 */
const getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job')
      .populate('jobSeeker', '-password -refreshToken')
      .populate('employer', 'name email companyName');

    if (!application) {
      return errorResponse(res, 404, 'Application not found');
    }

    // Check if related documents exist
    if (!application.job || !application.jobSeeker || !application.employer) {
      return errorResponse(res, 404, 'Application has missing related data (job or user may have been deleted)');
    }

    // Check access rights
    const isJobSeeker = application.jobSeeker._id.toString() === req.user.id;
    const isEmployer = application.employer._id.toString() === req.user.id;

    if (!isJobSeeker && !isEmployer) {
      return errorResponse(res, 403, 'You do not have permission to view this application');
    }

    return successResponse(res, 200, 'Application retrieved successfully', application);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/applications/:id/status
 * @desc    Update application status (employer action)
 * @access  Private (Employer only)
 */
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const application = await Application.findById(req.params.id);

    if (!application) {
      return errorResponse(res, 404, 'Application not found');
    }

    // Check if employer owns this application
    if (application.employer.toString() !== req.user.id) {
      return errorResponse(res, 403, 'You can only update applications for your own jobs');
    }

    // Update status
    application.status = status;
    if (note) {
      application.timeline.push({
        status,
        timestamp: new Date(),
        note,
      });
    }

    await application.save();

    await createApplicationNotification({
      application,
      title: `Application ${status}`,
      note: note || `Your application status was updated to ${status}.`,
      type: 'status_update',
    });

    return successResponse(res, 200, `Application status updated to ${status}`, application);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/applications/:id/withdraw
 * @desc    Withdraw application (job seeker action)
 * @access  Private (Job Seeker only)
 */
const withdrawApplication = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id);

    if (!application) {
      return errorResponse(res, 404, 'Application not found');
    }

    // Check ownership
    if (application.jobSeeker.toString() !== req.user.id) {
      return errorResponse(res, 403, 'You can only withdraw your own applications');
    }

    // Can't withdraw if already hired or rejected
    if (['hired', 'rejected'].includes(application.status)) {
      return errorResponse(res, 400, `Cannot withdraw application with status: ${application.status}`);
    }

    application.status = 'withdrawn';
    application.timeline.push({
      status: 'withdrawn',
      timestamp: new Date(),
      note: 'Application withdrawn by job seeker',
    });

    await application.save();

    await createApplicationNotification({
      application,
      title: 'Application withdrawn',
      note: `The candidate withdrew their application for ${application.job || 'your job posting'}.`,
      type: 'status_update',
      sender: application.jobSeeker,
      receiver: application.employer,
    });

    return successResponse(res, 200, 'Application withdrawn successfully', application);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/applications/:id/schedule-interview
 * @desc    Schedule interview for application
 * @access  Private (Employer only)
 */
const scheduleInterview = async (req, res, next) => {
  try {
    const { date, time, mode, location, meetingLink, notes } = req.body;

    const application = await Application.findById(req.params.id);

    if (!application) {
      return errorResponse(res, 404, 'Application not found');
    }

    // Check if employer owns this application
    if (application.employer.toString() !== req.user.id) {
      return errorResponse(res, 403, 'You can only schedule interviews for your own jobs');
    }

    // Update interview details
    application.interview = {
      scheduled: true,
      date,
      time,
      mode,
      location,
      meetingLink,
      notes,
    };

    application.status = 'interview';
    application.timeline.push({
      status: 'interview',
      timestamp: new Date(),
      note: `Interview scheduled for ${date} at ${time}`,
    });

    await application.save();

    await createApplicationNotification({
      application,
      title: 'Interview scheduled',
      note: `Your interview is scheduled for ${date} at ${time}${meetingLink ? ` (link: ${meetingLink})` : ''}`,
      type: 'interview_invite',
    });

    return successResponse(res, 200, 'Interview scheduled successfully', application);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/applications/stats
 * @desc    Get application statistics for job seeker
 * @access  Private (Job Seeker only)
 */
const getApplicationStats = async (req, res, next) => {
  try {
    const stats = await Application.aggregate([
      {
        $match: { jobSeeker: req.user._id },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const formattedStats = {
      total: 0,
      pending: 0,
      viewed: 0,
      reviewed: 0,
      shortlisted: 0,
      interview: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0,
    };

    stats.forEach((stat) => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
    });

    return successResponse(res, 200, 'Application statistics retrieved', formattedStats);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/applications/employer/all
 * @desc    Get all applications for employer's jobs
 * @access  Private (Employer only)
 */
const getEmployerApplications = async (req, res, next) => {
  try {
    const { status, jobId, page = 1, limit = 100 } = req.query;

    const filter = { employer: req.user.id };
    if (status) {
      filter.status = status;
    }
    if (jobId) {
      filter.job = jobId;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const totalItems = await Application.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limitNum);

    const applications = await Application.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip)
      .populate('job', 'title companyName location salaryRange jobType workType status')
      .populate('jobSeeker', 'name email phone skills experience education resume profilePicture');

    // Filter out applications with null references (deleted jobs/job seekers)
    const validApplications = applications.filter(app => app.job && app.jobSeeker);

    return paginatedResponse(res, 200, 'Applications retrieved successfully', validApplications, {
      page: pageNum,
      limit: limitNum,
      totalPages,
      totalItems,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createApplication,
  getMyApplications,
  getEmployerApplications,
  getApplicationById,
  updateApplicationStatus,
  withdrawApplication,
  scheduleInterview,
  getApplicationStats,
};

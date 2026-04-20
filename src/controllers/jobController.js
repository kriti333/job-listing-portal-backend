const Job = require('../models/Job');
const Application = require('../models/Application');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');

/**
 * @route   POST /api/jobs
 * @desc    Create a new job posting
 * @access  Private (Employer only)
 */
const createJob = async (req, res, next) => {
  try {
    const {
      title,
      description,
      requiredSkills,
      experienceLevel,
      experienceYears,
      salaryRange,
      location,
      workType,
      jobType,
      closingDate,
    } = req.body;

    const job = await Job.create({
      title,
      description,
      requiredSkills,
      experienceLevel,
      experienceYears,
      salaryRange,
      location,
      workType,
      jobType,
      closingDate,
      employer: req.user.id,
      companyName: req.user.companyName || req.user.name,
      companyLogo: req.user.companyLogo,
    });

    return successResponse(res, 201, 'Job posted successfully', job);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/jobs
 * @desc    Get all jobs with filters and pagination
 * @access  Public
 */
const getAllJobs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      location,
      workType,
      jobType,
      experienceLevel,
      minSalary,
      maxSalary,
      skills,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build filter query
    const filter = { status: 'active' };

    // Search in title, description, and skills
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { requiredSkills: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    if (location) {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (workType) {
      filter.workType = workType;
    }

    if (jobType) {
      filter.jobType = jobType;
    }

    if (experienceLevel) {
      filter.experienceLevel = experienceLevel;
    }

    if (minSalary || maxSalary) {
      filter['salaryRange.min'] = {};
      if (minSalary) filter['salaryRange.min'].$gte = Number(minSalary);
      if (maxSalary) filter['salaryRange.max'] = { $lte: Number(maxSalary) };
    }

    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim());
      filter.requiredSkills = { $in: skillsArray.map(s => new RegExp(s, 'i')) };
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalItems = await Job.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limitNum);

    // Sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get jobs
    const jobs = await Job.find(filter)
      .sort(sort)
      .limit(limitNum)
      .skip(skip)
      .populate('employer', 'name companyName companyLogo email');

    return paginatedResponse(res, 200, 'Jobs retrieved successfully', jobs, {
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
 * @route   GET /api/jobs/:id
 * @desc    Get single job by ID
 * @access  Public
 */
const getJobById = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate(
      'employer',
      'name companyName companyLogo companyDescription companyWebsite email'
    );

    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    // Increment views
    await job.incrementViews();

    return successResponse(res, 200, 'Job retrieved successfully', job);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/jobs/employer/my-jobs
 * @desc    Get all jobs posted by current employer
 * @access  Private (Employer only)
 */
const getMyJobs = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { employer: req.user.id };
    if (status) {
      filter.status = status;
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const totalItems = await Job.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limitNum);

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip(skip);

    return paginatedResponse(res, 200, 'Your jobs retrieved successfully', jobs, {
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
 * @route   PUT /api/jobs/:id
 * @desc    Update job posting
 * @access  Private (Employer - own jobs only)
 */
const updateJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    // Check ownership
    if (job.employer.toString() !== req.user.id) {
      return errorResponse(res, 403, 'You can only update your own job postings');
    }

    // Update job
    const updatedJob = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    return successResponse(res, 200, 'Job updated successfully', updatedJob);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete job posting
 * @access  Private (Employer - own jobs only)
 */
const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    // Check ownership
    if (job.employer.toString() !== req.user.id) {
      return errorResponse(res, 403, 'You can only delete your own job postings');
    }

    // Delete associated applications
    await Application.deleteMany({ job: req.params.id });

    await job.deleteOne();

    return successResponse(res, 200, 'Job deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/jobs/:id/status
 * @desc    Change job status (active/paused/closed)
 * @access  Private (Employer - own jobs only)
 */
const updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const job = await Job.findById(req.params.id);

    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    // Check ownership
    if (job.employer.toString() !== req.user.id) {
      return errorResponse(res, 403, 'You can only update your own job postings');
    }

    job.status = status;
    await job.save();

    return successResponse(res, 200, `Job status changed to ${status}`, job);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/jobs/:id/applicants
 * @desc    Get all applicants for a specific job
 * @access  Private (Employer - own jobs only)
 */
const getJobApplicants = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return errorResponse(res, 404, 'Job not found');
    }

    // Check ownership
    if (job.employer.toString() !== req.user.id) {
      return errorResponse(res, 403, 'You can only view applicants for your own jobs');
    }

    const { status, page = 1, limit = 20 } = req.query;

    const filter = { job: req.params.id };
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
      .populate('jobSeeker', 'name email phone skills experience education resume profilePicture')
      .populate('job', 'title');

    // Filter out applications with null references (deleted job seekers/jobs)
    const validApplications = applications.filter(app => app.jobSeeker && app.job);

    return paginatedResponse(res, 200, 'Applicants retrieved successfully', validApplications, {
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
  createJob,
  getAllJobs,
  getJobById,
  getMyJobs,
  updateJob,
  deleteJob,
  updateJobStatus,
  getJobApplicants,
};

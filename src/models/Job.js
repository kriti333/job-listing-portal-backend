const mongoose = require('mongoose');

/**
 * Job Schema
 * Represents job postings created by employers
 */
const jobSchema = new mongoose.Schema(
  {
    // Job Details
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
    },
    
    // Requirements & Details
    requirements: [{
      type: String,
      trim: true,
    }],
    responsibilities: [{
      type: String,
      trim: true,
    }],
    benefits: [{
      type: String,
      trim: true,
    }],
    
    // Requirements
    requiredSkills: [{
      type: String,
      trim: true,
    }],
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead'],
      required: true,
    },
    experienceYears: {
      min: {
        type: Number,
        default: 0,
      },
      max: {
        type: Number,
      },
    },
    
    // Compensation
    salaryRange: {
      min: {
        type: Number,
        required: true,
      },
      max: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: 'INR',
      },
    },
    
    // Location & Work Type
    location: {
      type: String,
      required: true,
      trim: true,
    },
    workType: {
      type: String,
      enum: ['remote', 'onsite', 'hybrid'],
      required: true,
    },
    
    // Job Type
    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship'],
      required: true,
    },
    
    // Employer Information
    employer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    companyLogo: String,
    
    // Status
    status: {
      type: String,
      enum: ['draft', 'active', 'closed', 'paused'],
      default: 'active',
    },
    
    // Metadata
    views: {
      type: Number,
      default: 0,
    },
    applicationsCount: {
      type: Number,
      default: 0,
    },
    closingDate: {
      type: Date,
    },
    
    // SEO
    keywords: [{
      type: String,
      trim: true,
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes for search and filtering
jobSchema.index({ title: 'text', description: 'text', requiredSkills: 'text' });
jobSchema.index({ employer: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ 'salaryRange.min': 1, 'salaryRange.max': 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ experienceLevel: 1 });

/**
 * Increment views counter
 */
jobSchema.methods.incrementViews = async function () {
  this.views += 1;
  await this.save();
};

/**
 * Increment applications counter
 */
jobSchema.methods.incrementApplications = async function () {
  this.applicationsCount += 1;
  await this.save();
};

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;

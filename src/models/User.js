const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Represents both Job Seekers and Employers
 * Role-based access control implemented
 */
const userSchema = new mongoose.Schema(
  {
    // Basic Information
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: function () {
        return !this.googleId; // Password required only if not using Google OAuth
      },
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Don't return password by default
    },
    
    // Role & Authentication
    role: {
      type: String,
      enum: ['job_seeker', 'employer', 'admin'],
      default: 'job_seeker',
      required: true,
    },
    googleId: {
      type: String,
      sparse: true, // Allow multiple null values
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    
    // Profile Information
    phone: {
      type: String,
      trim: true,
    },
    profilePicture: {
      type: String,
      default: '',
    },
    
    // End-to-End Encryption
    publicKey: {
      type: String,
      default: '',
      select: false, // Only fetch when needed
    },
    
    // Job Seeker Specific Fields
    location: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    skills: [{
      type: String,
      trim: true,
    }],
    experience: [{
      company: String,
      position: String,
      startDate: Date,
      endDate: Date,
      current: Boolean,
      description: String,
    }],
    education: [{
      institution: String,
      degree: String,
      fieldOfStudy: String,
      startDate: Date,
      endDate: Date,
      grade: String,
    }],
    resume: {
      filename: String,
      path: String,
      uploadedAt: Date,
    },
    preferences: {
      desiredRole: String,
      expectedSalary: String,
      preferredLocations: [String],
      jobTypes: [String],
      workTypes: [String],
    },
    profileCompletion: {
      type: Number,
      default: 20, // Start with basic info
      min: 0,
      max: 100,
    },
    
    // Employer Specific Fields
    companyName: {
      type: String,
      trim: true,
    },
    companyLogo: {
      type: String,
      default: '',
    },
    companyDescription: {
      type: String,
      trim: true,
    },
    companyWebsite: {
      type: String,
      trim: true,
    },
    companyLocation: {
      type: String,
      trim: true,
    },
    companyDetails: {
      industry: String,
      companySize: String,
      website: String,
      founded: Number,
      description: String,
      headquarters: String,
      otherLocations: [String],
    },
    
    // Social Links (shared by both job seekers and employers)
    socialLinks: {
      linkedin: String,
      github: String,
      portfolio: String,
      twitter: String,
      facebook: String,
      instagram: String,
    },
    
    // Account Status
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    
    // Refresh Token for JWT
    refreshToken: {
      type: String,
      select: false,
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Indexes for performance
// Note: email index is automatically created by unique: true
// Note: googleId index is automatically created by sparse: true
userSchema.index({ role: 1 });

/**
 * Hash password before saving
 */
userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Compare password method
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Calculate profile completion percentage
 */
userSchema.methods.calculateProfileCompletion = function () {
  let completion = 0;
  const weights = {
    basicInfo: 20, // name, email (always present)
    phone: 10,
    profilePicture: 10,
    skills: 15,
    experience: 20,
    education: 15,
    resume: 10,
  };

  completion += weights.basicInfo;
  if (this.phone) completion += weights.phone;
  if (this.profilePicture) completion += weights.profilePicture;
  if (this.skills && this.skills.length > 0) completion += weights.skills;
  if (this.experience && this.experience.length > 0) completion += weights.experience;
  if (this.education && this.education.length > 0) completion += weights.education;
  if (this.resume && this.resume.filename) completion += weights.resume;

  this.profileCompletion = completion;
  return completion;
};

/**
 * Remove sensitive data from JSON response
 */
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

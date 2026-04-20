const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseHelper');
const { deleteFile } = require('../utils/fileUpload');

/**
 * @route   GET /api/users/profile
 * @desc    Get current user profile
 * @access  Private
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    return successResponse(res, 200, 'Profile retrieved successfully', user);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'name',
      'phone',
      'skills',
      'experience',
      'education',
      'companyName',
      'companyDescription',
      'companyWebsite',
      'companyLocation',
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true,
    });

    // Calculate profile completion
    user.calculateProfileCompletion();
    await user.save();

    return successResponse(res, 200, 'Profile updated successfully', user);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/users/profile/picture
 * @desc    Upload profile picture
 * @access  Private
 */
const uploadProfilePicture = async (req, res, next) => {
  try {
    console.log('📸 Upload profile picture request received');
    console.log('File object:', req.file ? 'EXISTS' : 'MISSING');
    if (req.file) {
      console.log('File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        supabaseUrl: req.file.supabaseUrl,
        fileName: req.file.fileName
      });
    }

    if (!req.file) {
      return errorResponse(res, 400, 'Please upload an image file');
    }

    const user = await User.findById(req.user.id);

    // Delete old profile picture if exists
    if (user.profilePicture) {
      // Extract file path from Supabase URL for deletion
      const urlParts = user.profilePicture.split('/storage/v1/object/public/')[1];
      if (urlParts) {
        await deleteFile(urlParts);
      }
    }

    // Update profile picture URL
    user.profilePicture = req.file.supabaseUrl;
    await user.save();

    console.log('✅ Profile picture updated in database:', user.profilePicture);

    return successResponse(res, 200, 'Profile picture uploaded successfully', {
      profilePicture: user.profilePicture,
    });
  } catch (error) {
    console.error('❌ Profile picture upload error:', error);
    next(error);
  }
};

/**
 * @route   POST /api/users/profile/resume
 * @desc    Upload resume (Job Seeker only)
 * @access  Private (Job Seeker)
 */
const uploadResume = async (req, res, next) => {
  try {
    console.log('📄 Upload resume request received');
    console.log('File object:', req.file ? 'EXISTS' : 'MISSING');
    if (req.file) {
      console.log('File details:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        supabaseUrl: req.file.supabaseUrl,
        fileName: req.file.fileName
      });
    }

    if (!req.file) {
      return errorResponse(res, 400, 'Please upload a resume file (PDF or Word)');
    }

    const user = await User.findById(req.user.id);

    // Delete old resume if exists
    if (user.resume && user.resume.path) {
      // Extract file path from Supabase URL for deletion
      const urlParts = user.resume.path.split('/storage/v1/object/public/')[1];
      if (urlParts) {
        await deleteFile(urlParts);
      }
    }

    // Update resume
    user.resume = {
      filename: req.file.originalname,
      path: req.file.supabaseUrl,
      uploadedAt: new Date(),
    };

    user.calculateProfileCompletion();
    await user.save();

    console.log('✅ Resume updated in database:', user.resume);

    return successResponse(res, 200, 'Resume uploaded successfully', {
      resume: user.resume,
    });
  } catch (error) {
    console.error('❌ Resume upload error:', error);
    next(error);
  }
};

/**
 * @route   POST /api/users/profile/company-logo
 * @desc    Upload company logo (Employer only)
 * @access  Private (Employer)
 */
const uploadCompanyLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return errorResponse(res, 400, 'Please upload an image file');
    }

    const user = await User.findById(req.user.id);

    // Delete old logo if exists
    if (user.companyLogo) {
      // Extract file path from Supabase URL for deletion
      const urlParts = user.companyLogo.split('/storage/v1/object/public/')[1];
      if (urlParts) {
        await deleteFile(urlParts);
      }
    }

    // Update company logo
    user.companyLogo = req.file.supabaseUrl;
    await user.save();

    return successResponse(res, 200, 'Company logo uploaded successfully', {
      companyLogo: user.companyLogo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    // Check if user has password (not OAuth user)
    if (!user.password) {
      return errorResponse(
        res,
        400,
        'Cannot change password for accounts created via Google Sign-In'
      );
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return errorResponse(res, 401, 'Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    await user.save();

    return successResponse(res, 200, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/users/account
 * @desc    Deactivate user account
 * @access  Private
 */
const deactivateAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    user.isActive = false;
    await user.save();

    return successResponse(res, 200, 'Account deactivated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID (basic info for messaging)
 * @access  Private
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('name email profilePicture role');
    
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    return successResponse(res, 200, 'User retrieved successfully', user);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/users/public-key
 * @desc    Update user's public encryption key
 * @access  Private
 */
const updatePublicKey = async (req, res, next) => {
  try {
    const { publicKey } = req.body;
    
    console.log('📝 Updating public key for user:', req.user._id || req.user.id);
    console.log('📝 Public key length:', publicKey?.length);

    if (!publicKey) {
      return errorResponse(res, 400, 'Public key is required');
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id || req.user.id, 
      { publicKey },
      { new: true }
    ).select('publicKey');
    
    console.log('✅ Public key updated successfully:', updatedUser?.publicKey?.substring(0, 50));

    return successResponse(res, 200, 'Public key updated successfully');
  } catch (error) {
    console.error('❌ Error updating public key:', error);
    next(error);
  }
};

/**
 * @route   GET /api/users/:id/public-key
 * @desc    Get user's public encryption key
 * @access  Private
 */
const getPublicKey = async (req, res, next) => {
  try {
    console.log('🔑 Fetching public key for user:', req.params.id);
    
    const user = await User.findById(req.params.id).select('publicKey');
    
    console.log('🔍 User found:', !!user);
    console.log('🔍 Public key exists:', !!user?.publicKey);
    console.log('🔍 Public key length:', user?.publicKey?.length);
    
    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    if (!user.publicKey) {
      return errorResponse(res, 404, 'Public key not found for this user');
    }

    return successResponse(res, 200, 'Public key retrieved successfully', { publicKey: user.publicKey });
  } catch (error) {
    console.error('❌ Error fetching public key:', error);
    next(error);
  }
};

module.exports = {
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
};

const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'job-portal-files';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase configuration is not set');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : supabase;

// Use admin client for uploads to bypass RLS policies
const supabaseUpload = supabaseAdmin;

// Initialize bucket if it doesn't exist
const initializeBucket = async () => {
  try {
    const { data, error } = await supabaseAdmin.storage.getBucket(bucketName);
    if (error && error.message.includes('not found')) {
      // Create bucket if it doesn't exist
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        fileSizeLimit: 5242880, // 5MB
      });
      if (createError) {
        console.error('❌ Error creating bucket:', createError);
      } else {
        console.log(`✅ Created Supabase bucket: ${bucketName}`);
      }
    } else if (error) {
      console.error('❌ Error checking bucket:', error);
    } else {
      console.log(`✅ Supabase bucket exists: ${bucketName}`);
      // Ensure bucket is public
      if (!data.public) {
        console.log('🔧 Making bucket public...');
        const { error: updateError } = await supabaseAdmin.storage.updateBucket(bucketName, {
          public: true
        });
        if (updateError) {
          console.error('❌ Error making bucket public:', updateError);
        } else {
          console.log('✅ Bucket is now public');
        }
      }
    }
  } catch (err) {
    console.error('❌ Error initializing bucket:', err);
  }
};

// Initialize bucket on startup
initializeBucket();

/**
 * Custom multer storage for Supabase Storage
 */
class SupabaseStorage {
  constructor(options = {}) {
    this.bucketName = options.bucketName || bucketName;
    this.getFileName = options.getFileName || this._getFileName;
  }

  _getFileName(req, file) {
    // Generate unique filename: userId/fieldname/timestamp_random_originalname
    const userId = req.user?.id || 'anonymous';
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    return `${userId}/${file.fieldname}/${timestamp}-${random}-${name}${ext}`;
  }

  _handleFile(req, file, cb) {
    const fileName = this.getFileName(req, file);

    console.log(`📤 Starting upload: ${fileName} (${file.size || 'unknown'} bytes, ${file.mimetype})`);
    console.log(`👤 User: ${req.user?.id || 'anonymous'}`);

    // For multer custom storage, we need to read the stream into a buffer
    const chunks = [];
    let fileSize = 0;

    file.stream.on('data', (chunk) => {
      chunks.push(chunk);
      fileSize += chunk.length;
    });

    file.stream.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      console.log(`📊 File buffer size: ${buffer.length} bytes`);

      try {
        // Upload to Supabase Storage using admin client (bypasses RLS)
        const { data, error } = await supabaseUpload.storage
          .from(this.bucketName)
          .upload(fileName, buffer, {
            contentType: file.mimetype,
            upsert: false, // Don't overwrite existing files
          });

        if (error) {
          console.error('❌ Supabase upload error:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          return cb(new Error(`Upload failed: ${error.message}`));
        }

        console.log('✅ File uploaded successfully:', data?.path);

        // Get public URL using regular client
        const { data: urlData } = supabase.storage
          .from(this.bucketName)
          .getPublicUrl(fileName);

        console.log('🔗 Public URL generated:', urlData.publicUrl);

        file.supabaseUrl = urlData.publicUrl;
        file.fileName = fileName;
        cb(null, {
          filename: fileName,
          path: urlData.publicUrl,
          size: fileSize,
        });
      } catch (error) {
        console.error('❌ Unexpected upload error:', error);
        console.error('Error details:', error.message);
        cb(new Error(`Unexpected upload error: ${error.message}`));
      }
    });

    file.stream.on('error', (error) => {
      console.error('❌ File stream error:', error);
      cb(new Error(`File stream error: ${error.message}`));
    });
  }

  _removeFile(req, file, cb) {
    // Optional: implement file removal if needed
    cb(null);
  }
}

/**
 * Configure storage for uploaded files
 */
const storage = new SupabaseStorage({
  bucketName: bucketName,
});

/**
 * File filter for validation
 */
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = {
    resume: ['.pdf', '.doc', '.docx'],
    image: ['.jpg', '.jpeg', '.png', '.gif'],
  };

  const ext = path.extname(file.originalname).toLowerCase();

  // Check file type based on field name
  if (file.fieldname === 'resume') {
    if (allowedTypes.resume.includes(ext)) {
      return cb(null, true);
    }
    return cb(new Error('Only PDF and Word documents are allowed for resumes'), false);
  }

  if (file.fieldname === 'profilePicture' || file.fieldname === 'companyLogo') {
    if (allowedTypes.image.includes(ext)) {
      return cb(null, true);
    }
    return cb(new Error('Only image files (JPG, PNG, GIF) are allowed'), false);
  }

  cb(null, true);
};

/**
 * Configure multer upload
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

/**
 * Delete file from Supabase Storage
 */
const deleteFile = async (fileName) => {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([fileName]);

    if (error) {
      console.error('Error deleting file from Supabase:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error deleting file from Supabase:', error);
    return false;
  }
};

module.exports = {
  upload,
  deleteFile,
};

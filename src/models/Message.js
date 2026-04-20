const mongoose = require('mongoose');

/**
 * Message Schema
 * Enables communication between job seekers and employers
 */
const messageSchema = new mongoose.Schema(
  {
    // Conversation Participants
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Message Content (plaintext only for non-encrypted messages)
    content: {
      type: String,
      default: '',
      trim: true,
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    
    // End-to-End Encryption - encrypted for sender to decrypt with their private key
    encryptedForSender: {
      type: String,
      default: '',
      maxlength: [5000, 'Encrypted content cannot exceed 5000 characters'],
    },
    
    // End-to-End Encryption - encrypted for receiver to decrypt with their private key
    encryptedForReceiver: {
      type: String,
      default: '',
      maxlength: [5000, 'Encrypted content cannot exceed 5000 characters'],
    },
    
    encrypted: {
      type: Boolean,
      default: false,
    },
    
    // Context (related to job/application)
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
    },
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
    },
    
    // Message Status
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    
    // Message Type
    type: {
      type: String,
      enum: ['text', 'interview_invite', 'status_update'],
      default: 'text',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, read: 1 });
messageSchema.index({ application: 1 });
messageSchema.index({ job: 1 });

/**
 * Mark message as read
 */
messageSchema.methods.markAsRead = async function () {
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
    await this.save();
  }
};

/**
 * Get conversation between two users
 */
messageSchema.statics.getConversation = async function (userId1, userId2, limit = 50) {
  return this.find({
    $or: [
      { sender: userId1, receiver: userId2 },
      { sender: userId2, receiver: userId1 },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender receiver', 'name profilePicture role')
    .populate('job', 'title companyName')
    .populate('application', 'status');
};

/**
 * Get unread count for a user
 */
messageSchema.statics.getUnreadCount = async function (userId) {
  return this.countDocuments({
    receiver: userId,
    read: false,
  });
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;

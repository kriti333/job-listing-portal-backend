const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const {
  sendMessage,
  getConversation,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getAllConversations,
} = require('../controllers/messageController');

const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Validation rules
const sendMessageValidation = [
  body('receiverId').notEmpty().withMessage('Receiver ID is required'),
  body('content').custom((value, { req }) => {
    // Content is required only if message is NOT encrypted
    if (!req.body.encrypted && (!value || value.trim() === '')) {
      throw new Error('Message content is required');
    }
    return true;
  }),
  body('encrypted').optional().isBoolean(),
  body('encryptedForSender').optional(),
  body('encryptedForReceiver').optional(),
  body('jobId').optional(),
  body('applicationId').optional(),
];

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', authenticate, sendMessageValidation, validate, sendMessage);

// @route   GET /api/messages/conversations
// @desc    Get all conversations
// @access  Private
router.get('/conversations', authenticate, getAllConversations);

// @route   GET /api/messages/conversation/:userId
// @desc    Get conversation with specific user
// @access  Private
router.get('/conversation/:userId', authenticate, getConversation);

// @route   GET /api/messages/unread-count
// @desc    Get unread message count
// @access  Private
router.get('/unread-count', authenticate, getUnreadCount);

// @route   PATCH /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.patch('/:id/read', authenticate, markAsRead);

// @route   PATCH /api/messages/read-all
// @desc    Mark all unread messages as read
// @access  Private
router.patch('/read-all', authenticate, markAllAsRead);

module.exports = router;

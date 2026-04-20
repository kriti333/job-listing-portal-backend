const Message = require('../models/Message');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/responseHelper');

/**
 * @route   POST /api/messages
 * @desc    Send a message
 * @access  Private
 */
const sendMessage = async (req, res, next) => {
  try {
    const { receiverId, content, jobId, applicationId, type, encrypted, encryptedForSender, encryptedForReceiver } = req.body;

    const message = await Message.create({
      sender: req.user._id || req.user.id,
      receiver: receiverId,
      content: encrypted ? '' : content, // Only store plaintext if NOT encrypted
      encryptedForSender: encryptedForSender || '',
      encryptedForReceiver: encryptedForReceiver || '',
      encrypted: encrypted || false,
      job: jobId,
      application: applicationId,
      type: type || 'text',
    });

    await message.populate('sender receiver', 'name profilePicture role');

    return successResponse(res, 201, 'Message sent successfully', message);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/messages/conversation/:userId
 * @desc    Get conversation with a specific user
 * @access  Private
 */
const getConversation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const messages = await Message.getConversation(req.user.id, userId, parseInt(limit));

    return successResponse(res, 200, 'Conversation retrieved successfully', messages);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/messages/unread-count
 * @desc    Get unread message count
 * @access  Private
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.getUnreadCount(req.user.id);
    return successResponse(res, 200, 'Unread count retrieved', { count });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return errorResponse(res, 404, 'Message not found');
    }

    // Only receiver can mark as read
    if (message.receiver.toString() !== req.user.id) {
      return errorResponse(res, 403, 'You can only mark your own messages as read');
    }

    await message.markAsRead();

    return successResponse(res, 200, 'Message marked as read', message);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/messages/read-all
 * @desc    Mark all unread messages as read for current user
 * @access  Private
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await Message.updateMany(
      { receiver: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return successResponse(res, 200, 'All messages marked as read', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/messages/conversations
 * @desc    Get all conversations (list of users with last message)
 * @access  Private
 */
const getAllConversations = async (req, res, next) => {
  try {
    // Get all unique users the current user has messaged with
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: req.user._id }, { receiver: req.user._id }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', req.user._id] },
              '$receiver',
              '$sender',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', req.user._id] },
                    { $eq: ['$read', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: 1,
          user: {
            _id: 1,
            name: 1,
            email: 1,
            profilePicture: 1,
            role: 1,
            companyName: 1,
          },
          lastMessage: {
            content: 1,
            createdAt: 1,
            read: 1,
          },
          unreadCount: 1,
        },
      },
      {
        $sort: { 'lastMessage.createdAt': -1 },
      },
    ]);

    return successResponse(res, 200, 'Conversations retrieved successfully', conversations);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  sendMessage,
  getConversation,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getAllConversations,
};

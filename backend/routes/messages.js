const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

// Get all conversations for a user
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.userId },
        { receiverId: req.userId }
      ]
    })
    .populate('senderId', 'name businessName district userType')
    .populate('receiverId', 'name businessName district userType')
    .sort({ createdAt: -1 });

    // Group by conversation
    const conversationsMap = new Map();
    
    messages.forEach(msg => {
      const otherUserId = msg.senderId._id.toString() === req.userId 
        ? msg.receiverId._id.toString() 
        : msg.senderId._id.toString();
      
      if (!conversationsMap.has(otherUserId)) {
        const otherUser = msg.senderId._id.toString() === req.userId 
          ? msg.receiverId 
          : msg.senderId;
        
        conversationsMap.set(otherUserId, {
          userId: otherUser._id,
          name: otherUser.businessName || otherUser.name,
          district: otherUser.district,
          userType: otherUser.userType,
          lastMessage: msg.message,
          lastMessageTime: msg.createdAt,
          conversationId: msg.conversationId,
          unreadCount: 0
        });
      }
    });

    // Count unread messages
    for (let [userId, conversation] of conversationsMap) {
      const unreadCount = await Message.countDocuments({
        conversationId: conversation.conversationId,
        receiverId: req.userId,
        isRead: false
      });
      conversation.unreadCount = unreadCount;
    }

    const conversations = Array.from(conversationsMap.values());
    
    res.json({ 
      success: true,
      conversations 
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Get messages for a specific conversation
router.get('/conversation/:otherUserId', verifyToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    
    // Generate conversation ID (consistent for both users)
    const conversationId = [req.userId, otherUserId].sort().join('-');
    
    const messages = await Message.find({ conversationId })
      .populate('senderId', 'name businessName district userType')
      .populate('receiverId', 'name businessName district userType')
      .sort({ createdAt: 1 });

    // Mark messages as read
    await Message.updateMany(
      {
        conversationId,
        receiverId: req.userId,
        isRead: false
      },
      { isRead: true }
    );

    // Get other user info
    const otherUser = await User.findById(otherUserId).select('name businessName district userType serviceType');

    res.json({ 
      success: true,
      messages,
      otherUser
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Send a message
router.post('/send', verifyToken, async (req, res) => {
  try {
    const { receiverId, message } = req.body;

    if (!receiverId || !message) {
      return res.status(400).json({ 
        success: false,
        message: 'Receiver and message are required' 
      });
    }

    // Generate conversation ID (consistent for both users)
    const conversationId = [req.userId, receiverId].sort().join('-');

    const newMessage = new Message({
      conversationId,
      senderId: req.userId,
      receiverId,
      message
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'name businessName district userType')
      .populate('receiverId', 'name businessName district userType');

    res.status(201).json({ 
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Get all vendors (for hosts to start conversations)
router.get('/vendors', verifyToken, async (req, res) => {
  try {
    const vendors = await User.find({ userType: 'vendor' })
      .select('name businessName district serviceType')
      .sort({ businessName: 1 });

    res.json({ 
      success: true,
      vendors 
    });
  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// Get unread message count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiverId: req.userId,
      isRead: false
    });

    res.json({ 
      success: true,
      count 
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

module.exports = router;
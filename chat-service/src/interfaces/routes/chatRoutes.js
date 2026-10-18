const express = require('express');
const chatController = require('../controllers/chatController');

const authMiddleware = require('../../middleware/authMiddleware');

const router = express.Router();

router.get('/rooms/:roomId/messages', authMiddleware, chatController.getHistory);

router.get('/rooms/:roomId/messages/search', authMiddleware, chatController.searchMessages);

router.get('/messages/:messageId/thread', authMiddleware, chatController.getThread);

module.exports = router;

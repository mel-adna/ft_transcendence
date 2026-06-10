const express = require('express');
const chatController = require('../controllers/chatController');

// Assumption: authMiddleware attaches req.user = { id, username, email }
// Replace with your actual auth middleware import
const authMiddleware = require('../../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /api/chat/rooms/:roomId/messages
 * Query params: cursor (string), limit (number, max 100)
 */
router.get('/rooms/:roomId/messages', authMiddleware, chatController.getHistory);

module.exports = router;

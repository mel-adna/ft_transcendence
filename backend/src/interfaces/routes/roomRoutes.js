const express = require('express');
const roomController = require('../controllers/roomController');
const presenceController = require('../controllers/presenceController');
const userController = require('../controllers/userController');
const authMiddleware = require('../../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/users', userController.listUsers);
router.get('/users/search', userController.searchUsers);

router.post('/rooms/dm', roomController.createDM);
router.post('/rooms', roomController.createGroup);
router.get('/rooms', roomController.listRooms);
router.post('/rooms/:roomId/invite', roomController.invite);
router.get('/rooms/:roomId/members', roomController.getMembers);
router.get('/rooms/:roomId/presence', presenceController.getRoomPresence);

module.exports = router;

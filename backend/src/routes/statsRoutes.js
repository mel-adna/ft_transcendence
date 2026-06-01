// Member 5 — Analytics & Data
// Stats & Export route declarations

const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

router.get('/summary', statsController.getStats);
router.get('/export/tasks', statsController.exportTasksCSV);

module.exports = router;

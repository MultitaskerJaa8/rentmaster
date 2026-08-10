const express = require('express');
const router = express.Router();
const { getStats, getActivity } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/stats', getStats);
router.get('/activity', getActivity);

module.exports = router;
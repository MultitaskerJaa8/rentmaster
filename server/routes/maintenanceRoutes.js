const express = require('express');
const router = express.Router();
const {
  getRequests, getRequestById, createRequest, updateStatus,
  assignRequest, addComment, rateRequest, deleteRequest,
} = require('../controllers/maintenanceController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.route('/').get(getRequests).post(authorize('admin', 'owner', 'tenant'), createRequest);
router.get('/:id', getRequestById);
router.put('/:id/status', authorize('admin', 'owner', 'staff'), updateStatus);
router.put('/:id/assign', authorize('admin', 'owner'), assignRequest);
router.post('/:id/comment', addComment);
router.put('/:id/rate', rateRequest);
router.delete('/:id', deleteRequest);

module.exports = router;
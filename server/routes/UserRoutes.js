const express = require('express');
const router = express.Router();
const {
  getUsers, getUserById, createUser, updateUser, deleteUser,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);
router.route('/').get(getUsers).post(authorize('admin'), createUser);
router
  .route('/:id')
  .get(authorize('admin', 'owner'), getUserById)
  .put(authorize('admin'), updateUser)
  .delete(authorize('admin'), deleteUser);

module.exports = router;
const express = require('express');
const router = express.Router();
const {
  getAmenities, createAmenity, updateAmenity, deleteAmenity, getSlots,
  getBookings, createBooking, checkIn, checkOut, cancelBooking,
} = require('../controllers/amenityController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

/* Bookings (declare BEFORE /:id to avoid route shadowing) */
router.route('/bookings').get(getBookings).post(createBooking);
router.put('/bookings/:id/checkin', checkIn);
router.put('/bookings/:id/checkout', checkOut);
router.put('/bookings/:id/cancel', cancelBooking);

/* Amenities */
router.route('/').get(getAmenities).post(authorize('admin', 'owner'), createAmenity);
router.get('/:id/slots', getSlots);
router
  .route('/:id')
  .put(authorize('admin', 'owner'), updateAmenity)
  .delete(authorize('admin', 'owner'), deleteAmenity);

module.exports = router;
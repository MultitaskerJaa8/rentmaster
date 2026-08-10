const express = require('express');
const router = express.Router();

const Property = require('../models/Property');
const {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
} = require('../controllers/propertyController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

/* ------------------------------------------------------------------
   PUBLIC ROUTE (no auth) — used by RegisterPage tenant dropdown
   Must be declared BEFORE router.use(protect)
------------------------------------------------------------------- */
router.get('/public/list', async (req, res) => {
  try {
    const props = await Property.find({ status: { $ne: 'Inactive' } })
      .select('name address.city')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: props.map((p) => ({
        _id: p._id,
        name: p.name,
        city: p.address?.city || '',
      })),
    });
  } catch (err) {
    res.json({ success: true, data: [] });
  }
});

/* ------------------------------------------------------------------
   PROTECTED ROUTES
------------------------------------------------------------------- */
router.use(protect);

router
  .route('/')
  .get(getProperties)
  .post(authorize('admin', 'owner'), createProperty);

router
  .route('/:id')
  .get(getPropertyById)
  .put(authorize('admin', 'owner'), updateProperty)
  .delete(authorize('admin', 'owner'), deleteProperty);

module.exports = router;
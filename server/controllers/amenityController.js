const asyncHandler = require('express-async-handler');
const Amenity = require('../models/Amenity');
const AmenityBooking = require('../models/AmenityBooking');
const Property = require('../models/Property');

/* ------------------------- helpers ------------------------- */
const toDateTime = (dateStr, timeStr) => new Date(`${dateStr}T${timeStr}:00`);
const pad = (n) => String(n).padStart(2, '0');
const toHHMM = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const ownerScopeProps = async (user) => {
  const props = await Property.find({ owner: user._id }).select('_id').lean();
  return props.map((p) => p._id);
};

/* ========================= AMENITIES ========================= */

// @route GET /api/amenities
const getAmenities = asyncHandler(async (req, res) => {
  const { property = '', category = '', status = '', search = '' } = req.query;
  const filter = {};

  if (req.user.role === 'owner') filter.property = { $in: await ownerScopeProps(req.user) };
  if (req.user.role === 'tenant' && req.user.property)
    filter.property = req.user.property._id || req.user.property;

  if (property) filter.property = property;
  if (category) filter.category = category;
  if (status) filter.availabilityStatus = status;
  if (search) filter.name = new RegExp(search, 'i');

  const amenities = await Amenity.find(filter)
    .populate('property', 'name code address')
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  const today = new Date().toISOString().slice(0, 10);
  const ids = amenities.map((a) => a._id);
  const todays = await AmenityBooking.aggregate([
    { $match: { amenity: { $in: ids }, bookingDate: today, status: { $in: ['Booked', 'CheckedIn'] } } },
    { $group: { _id: '$amenity', count: { $sum: 1 } } },
  ]);
  const map = todays.reduce((a, c) => ({ ...a, [String(c._id)]: c.count }), {});

  res.json({
    success: true,
    count: amenities.length,
    data: amenities.map((a) => ({ ...a, todayBookings: map[String(a._id)] || 0 })),
    syncedAt: new Date().toISOString(),
  });
});

// @route POST /api/amenities
const createAmenity = asyncHandler(async (req, res) => {
  const { name, property } = req.body;
  if (!name || !property) {
    res.status(400);
    throw new Error('Amenity name and property are required');
  }
  const prop = await Property.findById(property);
  if (!prop) {
    res.status(404);
    throw new Error('Property not found');
  }
  if (req.user.role !== 'admin' && String(prop.owner) !== String(req.user._id)) {
    res.status(403);
    throw new Error('You can add amenities only to your own properties');
  }

  const amenity = await Amenity.create(req.body);
  const populated = await amenity.populate('property', 'name code');
  res.status(201).json({ success: true, message: 'Amenity added successfully', data: populated });
});

// @route PUT /api/amenities/:id
const updateAmenity = asyncHandler(async (req, res) => {
  const amenity = await Amenity.findById(req.params.id).populate('property', 'owner name');
  if (!amenity) {
    res.status(404);
    throw new Error('Amenity not found');
  }
  if (req.user.role !== 'admin' && String(amenity.property.owner) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to edit this amenity');
  }

  const fields = [
    'name', 'category', 'description', 'location', 'capacity', 'openTime', 'closeTime',
    'slotDurationMins', 'maxHoursPerBooking', 'bookingFee', 'availabilityStatus', 'imageUrl', 'rules',
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) amenity[f] = req.body[f];
  });

  await amenity.save();
  res.json({ success: true, message: 'Amenity updated', data: amenity });
});

// @route DELETE /api/amenities/:id
const deleteAmenity = asyncHandler(async (req, res) => {
  const amenity = await Amenity.findById(req.params.id).populate('property', 'owner');
  if (!amenity) {
    res.status(404);
    throw new Error('Amenity not found');
  }
  if (req.user.role !== 'admin' && String(amenity.property.owner) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Not authorized to delete this amenity');
  }

  const active = await AmenityBooking.countDocuments({
    amenity: amenity._id,
    status: { $in: ['Booked', 'CheckedIn'] },
  });
  if (active > 0) {
    res.status(400);
    throw new Error(`Cannot delete: ${active} active booking(s) exist for this amenity`);
  }

  await amenity.deleteOne();
  res.json({ success: true, message: 'Amenity deleted' });
});

// @route GET /api/amenities/:id/slots?date=YYYY-MM-DD
const getSlots = asyncHandler(async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  const amenity = await Amenity.findById(req.params.id);
  if (!amenity) {
    res.status(404);
    throw new Error('Amenity not found');
  }

  const bookings = await AmenityBooking.find({
    amenity: amenity._id,
    bookingDate: date,
    status: { $in: ['Booked', 'CheckedIn'] },
  })
    .populate('user', 'name avatarColor')
    .lean();

  const start = toDateTime(date, amenity.openTime);
  const end = toDateTime(date, amenity.closeTime);
  const step = amenity.slotDurationMins * 60000;
  const now = Date.now();

  const slots = [];
  for (let t = start.getTime(); t + step <= end.getTime(); t += step) {
    const sIn = new Date(t);
    const sOut = new Date(t + step);
    const overlapping = bookings.filter(
      (b) => new Date(b.checkIn) < sOut && new Date(b.checkOut) > sIn
    );
    const booked = overlapping.length >= amenity.capacity;
    slots.push({
      start: toHHMM(sIn),
      end: toHHMM(sOut),
      checkIn: sIn.toISOString(),
      checkOut: sOut.toISOString(),
      seatsLeft: Math.max(0, amenity.capacity - overlapping.length),
      isPast: sOut.getTime() < now,
      isBooked: booked,
      available:
        !booked && sOut.getTime() > now && amenity.availabilityStatus === 'Available',
      bookedBy: overlapping.map((b) => b.user?.name).filter(Boolean),
    });
  }

  res.json({
    success: true,
    data: { amenity, date, slots, totalBookings: bookings.length },
    syncedAt: new Date().toISOString(),
  });
});

/* ========================= BOOKINGS ========================= */

// @route GET /api/amenities/bookings
const getBookings = asyncHandler(async (req, res) => {
  const { date = '', status = '', amenity = '', scope = '' } = req.query;
  const filter = {};

  if (req.user.role === 'tenant' || scope === 'mine') filter.user = req.user._id;
  else if (req.user.role === 'owner') filter.property = { $in: await ownerScopeProps(req.user) };

  if (date) filter.bookingDate = date;
  if (status) filter.status = status;
  if (amenity) filter.amenity = amenity;

  const data = await AmenityBooking.find(filter)
    .populate('amenity', 'name category imageUrl location openTime closeTime')
    .populate('property', 'name code')
    .populate('user', 'name email phone avatarColor unitNumber')
    .sort({ checkIn: -1 })
    .lean({ virtuals: true });

  const stats = {
    total: data.length,
    booked: data.filter((d) => d.status === 'Booked').length,
    checkedIn: data.filter((d) => d.status === 'CheckedIn').length,
    completed: data.filter((d) => d.status === 'Completed').length,
    cancelled: data.filter((d) => d.status === 'Cancelled').length,
  };

  res.json({ success: true, count: data.length, stats, data, syncedAt: new Date().toISOString() });
});

// @route POST /api/amenities/bookings  🔒 CONFLICT-PROOF
const createBooking = asyncHandler(async (req, res) => {
  const { amenity: amenityId, bookingDate, startTime, endTime, guests = 1, purpose = '' } = req.body;

  if (!amenityId || !bookingDate || !startTime || !endTime) {
    res.status(400);
    throw new Error('Amenity, date, check-in time and check-out time are required');
  }

  const amenity = await Amenity.findById(amenityId).populate('property', '_id name');
  if (!amenity) {
    res.status(404);
    throw new Error('Amenity not found');
  }
  if (amenity.availabilityStatus !== 'Available') {
    res.status(400);
    throw new Error(`This amenity is currently ${amenity.availabilityStatus}`);
  }

  const checkIn = toDateTime(bookingDate, startTime);
  const checkOut = toDateTime(bookingDate, endTime);

  // ---- Rule 1: valid range
  if (isNaN(checkIn) || isNaN(checkOut) || checkOut <= checkIn) {
    res.status(400);
    throw new Error('Check-out time must be after check-in time');
  }
  // ---- Rule 2: no past booking
  if (checkIn.getTime() < Date.now() - 60000) {
    res.status(400);
    throw new Error('You cannot book a slot in the past');
  }
  // ---- Rule 3: operating hours
  const open = toDateTime(bookingDate, amenity.openTime);
  const close = toDateTime(bookingDate, amenity.closeTime);
  if (checkIn < open || checkOut > close) {
    res.status(400);
    throw new Error(`Booking must be between operating hours ${amenity.openTime} - ${amenity.closeTime}`);
  }
  // ---- Rule 4: max duration
  const hours = (checkOut - checkIn) / 36e5;
  if (hours > amenity.maxHoursPerBooking) {
    res.status(400);
    throw new Error(`Maximum ${amenity.maxHoursPerBooking} hour(s) allowed per booking`);
  }
  // ---- Rule 5: guests within capacity
  if (Number(guests) > amenity.capacity) {
    res.status(400);
    throw new Error(`Guests exceed amenity capacity of ${amenity.capacity}`);
  }

  // ---- Rule 6: OVERLAP / CAPACITY CHECK (zero double booking)
  const overlaps = await AmenityBooking.find({
    amenity: amenity._id,
    bookingDate,
    status: { $in: ['Booked', 'CheckedIn'] },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  }).populate('user', 'name');

  if (overlaps.length >= amenity.capacity) {
    res.status(409);
    throw new Error(
      `⛔ Slot conflict! ${amenity.name} is already fully booked from ${startTime} to ${endTime}. Please choose another slot.`
    );
  }

  // ---- Rule 7: same user can't double-book overlapping slots
  const selfClash = overlaps.find((b) => String(b.user?._id || b.user) === String(req.user._id));
  if (selfClash) {
    res.status(409);
    throw new Error('You already have a booking that overlaps this time slot');
  }

  const booking = await AmenityBooking.create({
    amenity: amenity._id,
    property: amenity.property._id,
    user: req.user._id,
    bookingDate,
    checkIn,
    checkOut,
    guests: Number(guests) || 1,
    purpose,
    status: 'Booked',
  });

  const populated = await AmenityBooking.findById(booking._id)
    .populate('amenity', 'name category imageUrl location')
    .populate('property', 'name code')
    .populate('user', 'name email avatarColor');

  res.status(201).json({
    success: true,
    message: `✅ Booking confirmed! ${booking.bookingId} · ${startTime} - ${endTime}`,
    data: populated,
  });
});

// @route PUT /api/amenities/bookings/:id/checkin
const checkIn = asyncHandler(async (req, res) => {
  const booking = await AmenityBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (String(booking.user) !== String(req.user._id) && !['admin', 'owner'].includes(req.user.role)) {
    res.status(403);
    throw new Error('Not authorized for this booking');
  }
  if (booking.status !== 'Booked') {
    res.status(400);
    throw new Error(`Cannot check-in. Booking is already ${booking.status}`);
  }

  booking.status = 'CheckedIn';
  booking.actualCheckInAt = new Date();
  await booking.save();
  res.json({ success: true, message: '🟢 Checked in successfully', data: booking });
});

// @route PUT /api/amenities/bookings/:id/checkout
const checkOut = asyncHandler(async (req, res) => {
  const booking = await AmenityBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (String(booking.user) !== String(req.user._id) && !['admin', 'owner'].includes(req.user.role)) {
    res.status(403);
    throw new Error('Not authorized for this booking');
  }
  if (booking.status !== 'CheckedIn') {
    res.status(400);
    throw new Error('You must check-in before checking out');
  }

  booking.status = 'Completed';
  booking.actualCheckOutAt = new Date();
  await booking.save();
  res.json({ success: true, message: '✅ Checked out. Booking completed', data: booking });
});

// @route PUT /api/amenities/bookings/:id/cancel
const cancelBooking = asyncHandler(async (req, res) => {
  const booking = await AmenityBooking.findById(req.params.id);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (String(booking.user) !== String(req.user._id) && !['admin', 'owner'].includes(req.user.role)) {
    res.status(403);
    throw new Error('Not authorized to cancel this booking');
  }
  if (['Completed', 'Cancelled'].includes(booking.status)) {
    res.status(400);
    throw new Error(`Booking is already ${booking.status}`);
  }

  booking.status = 'Cancelled';
  booking.cancelReason = req.body.reason || 'Cancelled by user';
  await booking.save();
  res.json({ success: true, message: 'Booking cancelled. Slot is now free.', data: booking });
});

module.exports = {
  getAmenities,
  createAmenity,
  updateAmenity,
  deleteAmenity,
  getSlots,
  getBookings,
  createBooking,
  checkIn,
  checkOut,
  cancelBooking,
};
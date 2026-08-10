const asyncHandler = require('express-async-handler');
const Property = require('../models/Property');
const User = require('../models/User');
const Amenity = require('../models/Amenity');
const AmenityBooking = require('../models/AmenityBooking');
const MaintenanceRequest = require('../models/MaintenanceRequest');

const getScope = async (user) => {
  if (user.role === 'admin') return { propIds: null };
  if (user.role === 'owner') {
    const props = await Property.find({ owner: user._id }).select('_id').lean();
    return { propIds: props.map((p) => p._id) };
  }
  if (user.role === 'tenant')
    return { propIds: user.property ? [user.property._id || user.property] : [] };
  return { propIds: null }; // staff
};

// @route GET /api/dashboard/stats
const getStats = asyncHandler(async (req, res) => {
  const { propIds } = await getScope(req.user);
  const propFilter = propIds ? { property: { $in: propIds } } : {};
  const propSelfFilter = propIds ? { _id: { $in: propIds } } : {};

  const mrFilter = { ...propFilter };
  if (req.user.role === 'tenant') mrFilter.raisedBy = req.user._id;
  if (req.user.role === 'staff') mrFilter.$or = [{ assignedTo: req.user._id }, { assignedTo: null }];

  const bkFilter = { ...propFilter };
  if (req.user.role === 'tenant') bkFilter.user = req.user._id;

  const today = new Date().toISOString().slice(0, 10);

  const [
    totalProperties,
    totalTenants,
    totalAmenities,
    mrAll,
    bookingsToday,
    activeBookings,
    recentRequests,
    upcomingBookings,
  ] = await Promise.all([
    Property.countDocuments(propSelfFilter),
    User.countDocuments({ role: 'tenant', ...(propIds ? { property: { $in: propIds } } : {}) }),
    Amenity.countDocuments(propFilter),
    MaintenanceRequest.find(mrFilter).select('status createdAt resolvedAt category priority').lean(),
    AmenityBooking.countDocuments({ ...bkFilter, bookingDate: today, status: { $ne: 'Cancelled' } }),
    AmenityBooking.countDocuments({ ...bkFilter, status: 'CheckedIn' }),
    MaintenanceRequest.find(mrFilter)
      .populate('property', 'name code')
      .populate('raisedBy', 'name avatarColor')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean({ virtuals: true }),
    AmenityBooking.find({ ...bkFilter, status: { $in: ['Booked', 'CheckedIn'] }, checkOut: { $gte: new Date() } })
      .populate('amenity', 'name category imageUrl')
      .populate('user', 'name avatarColor')
      .sort({ checkIn: 1 })
      .limit(6)
      .lean({ virtuals: true }),
  ]);

  const pending = mrAll.filter((r) => r.status === 'Pending').length;
  const inProgress = mrAll.filter((r) => r.status === 'In Progress').length;
  const completed = mrAll.filter((r) => r.status === 'Completed').length;
  const cancelled = mrAll.filter((r) => r.status === 'Cancelled').length;

  const resolved = mrAll.filter((r) => r.resolvedAt);
  const avgResolutionHours = resolved.length
    ? Math.round(
        (resolved.reduce((s, r) => s + (new Date(r.resolvedAt) - new Date(r.createdAt)) / 36e5, 0) /
          resolved.length) *
          10
      ) / 10
    : 0;

  const completionRate = mrAll.length ? Math.round((completed / mrAll.length) * 100) : 0;
  const overdue = mrAll.filter(
    (r) => !['Completed', 'Cancelled'].includes(r.status) && (Date.now() - new Date(r.createdAt)) / 36e5 > 48
  ).length;

  // last 7 days trend
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    trend.push({
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: d.toISOString().slice(0, 10),
      created: mrAll.filter((r) => new Date(r.createdAt) >= d && new Date(r.createdAt) < next).length,
      resolved: mrAll.filter((r) => r.resolvedAt && new Date(r.resolvedAt) >= d && new Date(r.resolvedAt) < next).length,
    });
  }

  const byCategory = ['Plumbing', 'Electrical', 'Carpentry', 'Appliance', 'Cleaning', 'Security', 'Other'].map(
    (c) => ({ name: c, value: mrAll.filter((r) => r.category === c).length })
  );

  const byPriority = ['Urgent', 'High', 'Medium', 'Low'].map((p) => ({
    name: p,
    value: mrAll.filter((r) => r.priority === p).length,
  }));

  res.json({
    success: true,
    syncedAt: new Date().toISOString(),
    data: {
      cards: {
        totalProperties,
        totalTenants,
        totalAmenities,
        totalRequests: mrAll.length,
        pending,
        inProgress,
        completed,
        cancelled,
        overdue,
        bookingsToday,
        activeBookings,
      },
      kpis: {
        avgResolutionHours,
        completionRate,
        conflictCount: 0,
        slaTarget: 48,
        slaMet: avgResolutionHours > 0 && avgResolutionHours <= 48,
      },
      charts: { trend, byCategory, byPriority },
      recentRequests,
      upcomingBookings,
    },
  });
});

// @route GET /api/dashboard/activity
const getActivity = asyncHandler(async (req, res) => {
  const { propIds } = await getScope(req.user);
  const propFilter = propIds ? { property: { $in: propIds } } : {};

  const [requests, bookings] = await Promise.all([
    MaintenanceRequest.find(propFilter)
      .populate('raisedBy', 'name avatarColor')
      .populate('property', 'name')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean(),
    AmenityBooking.find(propFilter)
      .populate('user', 'name avatarColor')
      .populate('amenity', 'name')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean(),
  ]);

  const feed = [
    ...requests.map((r) => ({
      id: String(r._id),
      type: 'maintenance',
      title: r.title,
      subtitle: `${r.ticketId} · ${r.property?.name || ''}`,
      status: r.status,
      user: r.raisedBy?.name || 'User',
      color: r.raisedBy?.avatarColor || '#6366f1',
      at: r.updatedAt,
    })),
    ...bookings.map((b) => ({
      id: String(b._id),
      type: 'booking',
      title: b.amenity?.name || 'Amenity',
      subtitle: `${b.bookingId} · ${b.bookingDate}`,
      status: b.status,
      user: b.user?.name || 'User',
      color: b.user?.avatarColor || '#0ea5e9',
      at: b.updatedAt,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 14);

  res.json({ success: true, data: feed, syncedAt: new Date().toISOString() });
});

module.exports = { getStats, getActivity };
const asyncHandler = require('express-async-handler');
const Property = require('../models/Property');
const User = require('../models/User');
const Amenity = require('../models/Amenity');
const MaintenanceRequest = require('../models/MaintenanceRequest');

/** Scope helper: what properties can this user see? */
const scopeFilter = (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'owner') return { owner: user._id };
  if (user.role === 'tenant') return user.property ? { _id: user.property._id || user.property } : { _id: null };
  return {}; // staff can view all (to service them)
};

// @route GET /api/properties
const getProperties = asyncHandler(async (req, res) => {
  const { search = '', status = '', type = '', city = '' } = req.query;

  const filter = { ...scopeFilter(req.user) };
  if (status) filter.status = status;
  if (type) filter.type = type;
  if (city) filter['address.city'] = new RegExp(city, 'i');
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { code: new RegExp(search, 'i') },
      { 'address.city': new RegExp(search, 'i') },
      { 'address.line1': new RegExp(search, 'i') },
    ];
  }

  const properties = await Property.find(filter)
    .populate('owner', 'name email phone avatarColor')
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  // attach live counters
  const ids = properties.map((p) => p._id);
  const [openReqs, amenCounts, tenantCounts] = await Promise.all([
    MaintenanceRequest.aggregate([
      { $match: { property: { $in: ids }, status: { $in: ['Pending', 'In Progress'] } } },
      { $group: { _id: '$property', count: { $sum: 1 } } },
    ]),
    Amenity.aggregate([{ $match: { property: { $in: ids } } }, { $group: { _id: '$property', count: { $sum: 1 } } }]),
    User.aggregate([
      { $match: { property: { $in: ids }, role: 'tenant' } },
      { $group: { _id: '$property', count: { $sum: 1 } } },
    ]),
  ]);

  const map = (arr) => arr.reduce((a, c) => ({ ...a, [String(c._id)]: c.count }), {});
  const openMap = map(openReqs);
  const amenMap = map(amenCounts);
  const tenMap = map(tenantCounts);

  const data = properties.map((p) => ({
    ...p,
    openRequests: openMap[String(p._id)] || 0,
    amenityCount: amenMap[String(p._id)] || 0,
    tenantCount: tenMap[String(p._id)] || 0,
    occupancyRate: p.totalUnits ? Math.round((p.occupiedUnits / p.totalUnits) * 100) : 0,
  }));

  res.json({ success: true, count: data.length, data });
});

// @route GET /api/properties/:id
const getPropertyById = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id).populate(
    'owner',
    'name email phone avatarColor'
  );
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  const [amenities, tenants, requests] = await Promise.all([
    Amenity.find({ property: property._id }).sort({ name: 1 }),
    User.find({ property: property._id, role: 'tenant' }).select('name email phone unitNumber avatarColor'),
    MaintenanceRequest.find({ property: property._id }).sort({ createdAt: -1 }).limit(10),
  ]);

  res.json({ success: true, data: { property, amenities, tenants, requests } });
});

// @route POST /api/properties
const createProperty = asyncHandler(async (req, res) => {
  const body = { ...req.body };
  if (req.user.role !== 'admin') body.owner = req.user._id;
  if (!body.owner) body.owner = req.user._id;

  if (!body.name || !body.address?.line1 || !body.address?.city) {
    res.status(400);
    throw new Error('Property name, address line and city are required');
  }

  const property = await Property.create(body);
  const populated = await property.populate('owner', 'name email avatarColor');
  res.status(201).json({ success: true, message: 'Property created successfully', data: populated });
});

// @route PUT /api/properties/:id
const updateProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }
  if (req.user.role !== 'admin' && String(property.owner) !== String(req.user._id)) {
    res.status(403);
    throw new Error('You can only edit properties you own');
  }

  const fields = [
    'name', 'type', 'description', 'address', 'totalUnits', 'occupiedUnits',
    'rentAmount', 'bedrooms', 'bathrooms', 'areaSqft', 'imageUrl', 'status', 'tags',
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) property[f] = req.body[f];
  });

  const saved = await property.save();
  const populated = await saved.populate('owner', 'name email avatarColor');
  res.json({ success: true, message: 'Property updated', data: populated });
});

// @route DELETE /api/properties/:id
const deleteProperty = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }
  if (req.user.role !== 'admin' && String(property.owner) !== String(req.user._id)) {
    res.status(403);
    throw new Error('You can only delete properties you own');
  }

  const openCount = await MaintenanceRequest.countDocuments({
    property: property._id,
    status: { $in: ['Pending', 'In Progress'] },
  });
  if (openCount > 0) {
    res.status(400);
    throw new Error(`Cannot delete: ${openCount} open maintenance request(s) exist for this property`);
  }

  await Amenity.deleteMany({ property: property._id });
  await MaintenanceRequest.deleteMany({ property: property._id });
  await User.updateMany({ property: property._id }, { $set: { property: null } });
  await property.deleteOne();

  res.json({ success: true, message: 'Property and related records deleted' });
});

module.exports = {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  scopeFilter,
};
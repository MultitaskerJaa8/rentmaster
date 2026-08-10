const asyncHandler = require('express-async-handler');
const MaintenanceRequest = require('../models/MaintenanceRequest');
const Property = require('../models/Property');

const populateAll = [
  { path: 'property', select: 'name code address imageUrl' },
  { path: 'raisedBy', select: 'name email phone role avatarColor' },
  { path: 'assignedTo', select: 'name email phone department avatarColor' },
];

const buildScope = async (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'owner') {
    const props = await Property.find({ owner: user._id }).select('_id').lean();
    return { property: { $in: props.map((p) => p._id) } };
  }
  if (user.role === 'staff') {
    return { $or: [{ assignedTo: user._id }, { assignedTo: null }] };
  }
  return { raisedBy: user._id }; // tenant
};

// @route GET /api/maintenance
const getRequests = asyncHandler(async (req, res) => {
  const { status = '', priority = '', category = '', property = '', search = '' } = req.query;

  const scope = await buildScope(req.user);
  const filter = { ...scope };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;
  if (property) filter.property = property;
  if (search) {
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { title: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') },
          { ticketId: new RegExp(search, 'i') },
        ],
      },
    ];
  }

  const data = await MaintenanceRequest.find(filter)
    .populate(populateAll)
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  const stats = {
    total: data.length,
    pending: data.filter((d) => d.status === 'Pending').length,
    inProgress: data.filter((d) => d.status === 'In Progress').length,
    completed: data.filter((d) => d.status === 'Completed').length,
    cancelled: data.filter((d) => d.status === 'Cancelled').length,
    overdue: data.filter(
      (d) =>
        !['Completed', 'Cancelled'].includes(d.status) &&
        (Date.now() - new Date(d.createdAt)) / 36e5 > 48
    ).length,
  };

  res.json({ success: true, count: data.length, stats, data, syncedAt: new Date().toISOString() });
});

// @route GET /api/maintenance/:id
const getRequestById = asyncHandler(async (req, res) => {
  const request = await MaintenanceRequest.findById(req.params.id).populate(populateAll);
  if (!request) {
    res.status(404);
    throw new Error('Maintenance request not found');
  }
  res.json({ success: true, data: request });
});

// @route POST /api/maintenance
const createRequest = asyncHandler(async (req, res) => {
  const { property, title, description, category, priority, unitNumber, imageUrl } = req.body;

  const propertyId = property || req.user.property?._id || req.user.property;
  if (!propertyId) {
    res.status(400);
    throw new Error('Please select a property for this request');
  }
  if (!title || !description) {
    res.status(400);
    throw new Error('Issue title and description are required');
  }

  const prop = await Property.findById(propertyId);
  if (!prop) {
    res.status(404);
    throw new Error('Selected property does not exist');
  }

  const request = await MaintenanceRequest.create({
    property: propertyId,
    raisedBy: req.user._id,
    title,
    description,
    category: category || 'Other',
    priority: priority || 'Medium',
    unitNumber: unitNumber || req.user.unitNumber || '',
    imageUrl: imageUrl || '',
    status: 'Pending',
    timeline: [
      {
        status: 'Pending',
        note: 'Request submitted and awaiting review',
        byName: req.user.name,
        at: new Date(),
      },
    ],
  });

  const populated = await MaintenanceRequest.findById(request._id).populate(populateAll);
  res.status(201).json({
    success: true,
    message: `Request ${request.ticketId} created successfully`,
    data: populated,
  });
});

// @route PUT /api/maintenance/:id/status
const updateStatus = asyncHandler(async (req, res) => {
  const { status, note = '', resolutionNote = '' } = req.body;
  const allowed = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
  if (!allowed.includes(status)) {
    res.status(400);
    throw new Error('Invalid status value');
  }

  const request = await MaintenanceRequest.findById(req.params.id).populate('property', 'owner');
  if (!request) {
    res.status(404);
    throw new Error('Maintenance request not found');
  }

  const isOwner = String(request.property?.owner) === String(req.user._id);
  const isStaffAssigned = req.user.role === 'staff';
  if (req.user.role !== 'admin' && !isOwner && !isStaffAssigned) {
    res.status(403);
    throw new Error('You are not allowed to update this request status');
  }

  request.status = status;
  if (status === 'Completed') {
    request.resolvedAt = new Date();
    if (resolutionNote) request.resolutionNote = resolutionNote;
  } else {
    request.resolvedAt = null;
  }

  request.timeline.push({
    status,
    note: note || resolutionNote || `Status changed to ${status}`,
    byName: req.user.name,
    at: new Date(),
  });

  await request.save();
  const populated = await MaintenanceRequest.findById(request._id).populate(populateAll);
  res.json({ success: true, message: `Status updated to ${status}`, data: populated });
});

// @route PUT /api/maintenance/:id/assign
const assignRequest = asyncHandler(async (req, res) => {
  const { assignedTo } = req.body;
  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error('Maintenance request not found');
  }

  request.assignedTo = assignedTo || null;
  if (assignedTo && request.status === 'Pending') request.status = 'In Progress';

  request.timeline.push({
    status: request.status,
    note: assignedTo ? 'Technician assigned to this request' : 'Assignment removed',
    byName: req.user.name,
    at: new Date(),
  });

  await request.save();
  const populated = await MaintenanceRequest.findById(request._id).populate(populateAll);
  res.json({ success: true, message: 'Assignment updated', data: populated });
});

// @route POST /api/maintenance/:id/comment
const addComment = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    res.status(400);
    throw new Error('Comment cannot be empty');
  }

  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error('Maintenance request not found');
  }

  request.comments.push({
    user: req.user._id,
    name: req.user.name,
    role: req.user.role,
    text: text.trim(),
  });
  await request.save();

  const populated = await MaintenanceRequest.findById(request._id).populate(populateAll);
  res.status(201).json({ success: true, message: 'Comment added', data: populated });
});

// @route PUT /api/maintenance/:id/rate
const rateRequest = asyncHandler(async (req, res) => {
  const { rating } = req.body;
  const request = await MaintenanceRequest.findById(req.params.id);
  if (!request) {
    res.status(404);
    throw new Error('Request not found');
  }
  if (String(request.raisedBy) !== String(req.user._id) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only the requester can rate this service');
  }
  request.rating = Math.max(0, Math.min(5, Number(rating) || 0));
  await request.save();
  res.json({ success: true, message: 'Thanks for your feedback!', data: request });
});

// @route DELETE /api/maintenance/:id
const deleteRequest = asyncHandler(async (req, res) => {
  const request = await MaintenanceRequest.findById(req.params.id).populate('property', 'owner');
  if (!request) {
    res.status(404);
    throw new Error('Request not found');
  }
  const isOwner = String(request.property?.owner) === String(req.user._id);
  const isRaiser = String(request.raisedBy) === String(req.user._id);
  if (req.user.role !== 'admin' && !isOwner && !isRaiser) {
    res.status(403);
    throw new Error('Not authorized to delete this request');
  }
  await request.deleteOne();
  res.json({ success: true, message: 'Request deleted' });
});

module.exports = {
  getRequests,
  getRequestById,
  createRequest,
  updateStatus,
  assignRequest,
  addComment,
  rateRequest,
  deleteRequest,
};
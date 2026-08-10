const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Property = require('../models/Property');

const shape = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  property: u.property,
  unitNumber: u.unitNumber,
  department: u.department,
  avatarColor: u.avatarColor,
  isActive: u.isActive,
  lastLogin: u.lastLogin,
  createdAt: u.createdAt,
});

// @route GET /api/users  (admin) | ?role=staff usable by owner/admin
const getUsers = asyncHandler(async (req, res) => {
  const { role = '', search = '', property = '' } = req.query;

  if (req.user.role === 'tenant') {
    res.status(403);
    throw new Error('Access denied');
  }
  if (req.user.role === 'owner' && !['staff', 'tenant'].includes(role)) {
    res.status(403);
    throw new Error('Owners can only view staff and tenants');
  }

  const filter = {};
  if (role) filter.role = role;
  if (property) filter.property = property;
  if (search) filter.$or = [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }];

  if (req.user.role === 'owner' && role === 'tenant') {
    const props = await Property.find({ owner: req.user._id }).select('_id').lean();
    filter.property = { $in: props.map((p) => p._id) };
  }

  const users = await User.find(filter)
    .populate('property', 'name code')
    .sort({ createdAt: -1 })
    .lean({ virtuals: true });

  res.json({ success: true, count: users.length, data: users.map(shape) });
});

// @route GET /api/users/:id
const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('property', 'name code address');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  res.json({ success: true, data: shape(user) });
});

// @route POST /api/users (admin creates user)
const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone, property, unitNumber, department } = req.body;
  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    res.status(409);
    throw new Error('Email already registered');
  }
  const user = await User.create({
    name, email, password, role: role || 'tenant', phone: phone || '',
    property: property || null, unitNumber: unitNumber || '', department: department || 'General',
  });
  res.status(201).json({ success: true, message: 'User created', data: shape(user) });
});

// @route PUT /api/users/:id
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  const { name, phone, role, property, unitNumber, department, isActive } = req.body;

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (role) user.role = role;
  if (property !== undefined) user.property = property || null;
  if (unitNumber !== undefined) user.unitNumber = unitNumber;
  if (department) user.department = department;
  if (isActive !== undefined) user.isActive = isActive;

  await user.save();
  const populated = await User.findById(user._id).populate('property', 'name code');
  res.json({ success: true, message: 'User updated', data: shape(populated) });
});

// @route DELETE /api/users/:id
const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) {
    res.status(400);
    throw new Error('You cannot delete your own account');
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }
  await user.deleteOne();
  res.json({ success: true, message: 'User removed' });
});

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };
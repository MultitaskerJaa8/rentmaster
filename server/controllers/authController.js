const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Property = require('../models/Property');
const generateToken = require('../utils/generateToken');

const AVATAR_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const shapeUser = (u) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
  property: u.property,
  unitNumber: u.unitNumber,
  department: u.department,
  avatarColor: u.avatarColor,
  initials: u.initials,
  isActive: u.isActive,
  createdAt: u.createdAt,
});

// @route POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, property, unitNumber, department } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }
  if (String(password).length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }

  const exists = await User.findOne({ email: String(email).toLowerCase() });
  if (exists) {
    res.status(409);
    throw new Error('An account with this email already exists');
  }


if (role === 'admin') {
  res.status(403);
  throw new Error('Admin accounts cannot self-register. Please sign in with admin credentials.');
}
const safeRole = ['owner', 'tenant', 'staff'].includes(role) ? role : 'tenant';

  const user = await User.create({
    name,
    email,
    password,
    phone: phone || '',
    role: safeRole,
    property: safeRole === 'tenant' && property ? property : null,
    unitNumber: unitNumber || '',
    department: safeRole === 'staff' ? department || 'General' : 'General',
    avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    lastLogin: new Date(),
  });

  if (safeRole === 'tenant' && property) {
    await Property.findByIdAndUpdate(property, { $inc: { occupiedUnits: 1 }, status: 'Occupied' });
  }

  const populated = await User.findById(user._id).populate('property', 'name code address');

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    token: generateToken(user._id, user.role),
    user: shapeUser(populated),
  });
});

// @route POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Please enter email and password');
  }

  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }
  if (!user.isActive) {
    res.status(403);
    throw new Error('Account deactivated. Please contact administrator.');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const populated = await User.findById(user._id).populate('property', 'name code address');

  res.json({
    success: true,
    message: `Welcome back, ${user.name.split(' ')[0]}!`,
    token: generateToken(user._id, user.role),
    user: shapeUser(populated),
  });
});

// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: shapeUser(req.user) });
});

// @route PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const { name, phone, unitNumber, currentPassword, newPassword } = req.body;

  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (unitNumber !== undefined) user.unitNumber = unitNumber;

  if (newPassword) {
    if (!currentPassword || !(await user.matchPassword(currentPassword))) {
      res.status(400);
      throw new Error('Current password is incorrect');
    }
    if (newPassword.length < 6) {
      res.status(400);
      throw new Error('New password must be at least 6 characters');
    }
    user.password = newPassword;
  }

  await user.save();
  const populated = await User.findById(user._id).populate('property', 'name code address');

  res.json({ success: true, message: 'Profile updated', user: shapeUser(populated) });
});

module.exports = { register, login, getMe, updateProfile };
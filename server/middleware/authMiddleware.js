const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

const protect = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized. No token provided.');
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).populate('property', 'name code address');

  if (!user) {
    res.status(401);
    throw new Error('User belonging to this token no longer exists');
  }
  if (!user.isActive) {
    res.status(403);
    throw new Error('Your account has been deactivated. Contact admin.');
  }

  req.user = user;
  next();
});

module.exports = { protect };
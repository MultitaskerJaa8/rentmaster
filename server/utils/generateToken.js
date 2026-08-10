const jwt = require('jsonwebtoken');

const generateToken = (userId, role) =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });

module.exports = generateToken;
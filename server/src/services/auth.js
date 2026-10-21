const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
const { AppError } = require('../utils/errors');

async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  const valid = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  const token = jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: jwtExpiresIn });
  return { token, user: publicUser(user) };
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    weeklyCap: user.weeklyCap,
  };
}

module.exports = { login, publicUser };

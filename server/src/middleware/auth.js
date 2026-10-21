const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/env');
const { AppError, asyncHandler } = require('../utils/errors');

const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Your session has expired. Please sign in again.');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.active)
    throw new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue.');
  req.user = user;
  next();
});

function allowRoles(...roles) {
  return (req, res, next) =>
    roles.includes(req.user.role)
      ? next()
      : next(new AppError(403, 'FORBIDDEN', 'You do not have permission to do that.'));
}

module.exports = { authenticate, allowRoles };

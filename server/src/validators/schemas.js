const Joi = require('joi');
const plainText = (label) =>
  Joi.string()
    .trim()
    .custom((value) =>
      value
        .replace(/<[^>]*>/g, '')
        .replace(/[<>]/g, '')
        .trim(),
    )
    .label(label);
const roles = ['Employee', 'Manager', 'Admin'];
const login = Joi.object({
  email: Joi.string().email().max(254).required(),
  password: Joi.string().min(1).max(200).required(),
});
const userCreate = Joi.object({
  name: plainText('name').min(1).max(100).required(),
  email: Joi.string().email().max(254).required(),
  password: Joi.string().min(5).max(200).required(),
  role: Joi.string()
    .valid(...roles)
    .required(),
  department: plainText('department')
    .max(80)
    .allow('', null)
    .when('role', { is: Joi.valid('Employee', 'Manager'), then: Joi.string().min(1).required() }),
  weeklyCap: Joi.number().min(0).max(60).default(12),
});
const cap = Joi.object({ weeklyCap: Joi.number().min(0).max(60).required() });
const slotCreate = Joi.object({
  title: plainText('title').min(1).max(120).required(),
  department: plainText('department').min(1).max(80),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),
  startTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required(),
  endTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
    .required(),
  requiredHeadcount: Joi.number().integer().min(1).max(50).required(),
});
const slotEdit = Joi.object({
  title: plainText('title').min(1).max(120),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
  startTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
  endTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
  requiredHeadcount: Joi.number().integer().min(1).max(50),
}).min(1);
const decision = Joi.object({ decision: Joi.string().valid('approved', 'rejected').required() });
const listQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(
    'open',
    'full',
    'cancelled',
    'pending',
    'approved',
    'rejected',
    'withdrawn',
  ),
  from: Joi.string().isoDate(),
  to: Joi.string().isoDate(),
});
const reportQuery = Joi.object({
  month: Joi.string()
    .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
    .required(),
  format: Joi.string().valid('csv'),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
module.exports = { login, userCreate, cap, slotCreate, slotEdit, decision, listQuery, reportQuery };

const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Joi = require('joi');
const User = require('../models/User');
const Slot = require('../models/Slot');
const Signup = require('../models/Signup');
const AuditLog = require('../models/AuditLog');
const { authenticate, allowRoles } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schema = require('../validators/schemas');
const { asyncHandler, AppError } = require('../utils/errors');
const { login, publicUser } = require('../services/auth');
const slotService = require('../services/slots');
const { istWeekBounds, parseSlot } = require('../utils/time');
const { recordAudit } = require('../services/audit');

const router = express.Router();
const pageInfo = (page, limit, total) => ({ page, limit, total, pages: Math.ceil(total / limit) });
const idParam = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id)
    ? next()
    : next(new AppError(404, 'NOT_FOUND', 'Record not found.'));

router.post(
  '/auth/login',
  validate(schema.login),
  asyncHandler(async (req, res) =>
    res.json({ data: await login(req.body.email, req.body.password) }),
  ),
);
router.get(
  '/auth/me',
  authenticate,
  asyncHandler(async (req, res) => res.json({ data: publicUser(req.user) })),
);

router.post(
  '/users',
  authenticate,
  allowRoles('Admin'),
  validate(schema.userCreate),
  asyncHandler(async (req, res) => {
    const input = req.body;
    const hash = await bcrypt.hash(input.password, 12);
    const user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash: hash,
      role: input.role,
      department: input.department || null,
      weeklyCap: input.weeklyCap,
    });
    res.status(201).json({ data: publicUser(user) });
  }),
);

router.get(
  '/users',
  authenticate,
  allowRoles('Admin', 'Manager'),
  validate(schema.listQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const filter = req.user.role === 'Admin' ? {} : { department: req.user.department };
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort({ name: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(filter),
    ]);
    res.json({ data: users.map(publicUser), meta: pageInfo(page, limit, total) });
  }),
);

router.patch(
  '/users/:id/ot-cap',
  authenticate,
  allowRoles('Admin'),
  idParam,
  validate(schema.cap),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found.');
    if (user.role !== 'Employee')
      throw new AppError(400, 'EMPLOYEE_REQUIRED', 'Weekly overtime caps apply to employees.');
    const before = { weeklyCap: user.weeklyCap };
    user.weeklyCap = req.body.weeklyCap;
    await user.save();
    await recordAudit({
      actor: req.user.id,
      action: 'user.cap_changed',
      entityType: 'user',
      entityId: user.id,
      before,
      after: { weeklyCap: user.weeklyCap },
    });
    res.json({ data: publicUser(user) });
  }),
);

router.post(
  '/slots',
  authenticate,
  allowRoles('Manager', 'Admin'),
  validate(schema.slotCreate),
  asyncHandler(async (req, res) =>
    res.status(201).json({ data: await slotService.createSlot(req.user, req.body) }),
  ),
);
router.get(
  '/slots',
  authenticate,
  validate(schema.listQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, status, from, to } = req.query;
    const filter = {};
    if (req.user.role !== 'Admin') filter.department = req.user.department;
    if (status) filter.status = status;
    if (from || to)
      filter.startAt = {
        ...(from ? { $gte: new Date(from) } : {}),
        ...(to ? { $lte: new Date(to) } : {}),
      };
    const employeeSignupFilter = { employee: req.user.id };
    let signupFilter = { status: 'pending' };
    if (req.user.role === 'Employee') {
      signupFilter = employeeSignupFilter;
      if (!status) {
        const activeSlotIds = await Signup.distinct('slot', {
          ...employeeSignupFilter,
          status: { $in: ['pending', 'approved'] },
        });
        filter.$or = [{ status: 'open' }, { _id: { $in: activeSlotIds } }];
      }
    }
    const [slots, total] = await Promise.all([
      Slot.find(filter)
        .sort({ startAt: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Slot.countDocuments(filter),
    ]);
    const signups = await Signup.find({
      slot: { $in: slots.map((slot) => slot.id) },
      ...(req.user.role === 'Employee' ? employeeSignupFilter : signupFilter),
    })
      .sort({ createdAt: -1, _id: -1 })
      .populate('employee', 'name email department');
    const approvedCounts = await Signup.aggregate([
      {
        $match: {
          slot: { $in: slots.map((slot) => slot._id) },
          status: 'approved',
        },
      },
      { $group: { _id: '$slot', count: { $sum: 1 } } },
    ]);
    const signupsBySlot = new Map();
    const mySignupBySlot = new Map();
    for (const signup of signups) {
      const slotId = signup.slot.toString();
      if (req.user.role === 'Employee') {
        if (!mySignupBySlot.has(slotId)) mySignupBySlot.set(slotId, signup);
      } else {
        if (!signupsBySlot.has(slotId)) signupsBySlot.set(slotId, []);
        signupsBySlot.get(slotId).push(signup);
      }
    }
    const approvedBySlot = new Map(
      approvedCounts.map(({ _id, count }) => [_id.toString(), count]),
    );
    res.json({
      data: slots.map((slot) => ({
        ...slot.toJSON(),
        signups: signupsBySlot.get(slot.id) || [],
        ...(req.user.role === 'Employee'
          ? { mySignup: mySignupBySlot.get(slot.id) || null }
          : {}),
        approvedHeadcount: approvedBySlot.get(slot.id) || 0,
        totalHeadcount: slot.requiredHeadcount,
        availableHeadcount: Math.max(
          slot.requiredHeadcount - (approvedBySlot.get(slot.id) || 0),
          0,
        ),
      })),
      meta: pageInfo(page, limit, total),
    });
  }),
);
router.patch(
  '/slots/:id',
  authenticate,
  allowRoles('Manager', 'Admin'),
  idParam,
  validate(schema.slotEdit),
  asyncHandler(async (req, res) =>
    res.json({ data: await slotService.updateSlot(req.user, req.params.id, req.body) }),
  ),
);
router.post(
  '/slots/:id/cancel',
  authenticate,
  allowRoles('Manager', 'Admin'),
  idParam,
  asyncHandler(async (req, res) =>
    res.json({ data: await slotService.cancelSlot(req.user, req.params.id) }),
  ),
);
router.post(
  '/slots/:id/signups',
  authenticate,
  allowRoles('Employee'),
  idParam,
  asyncHandler(async (req, res) =>
    res.status(201).json({ data: await slotService.signup(req.user, req.params.id) }),
  ),
);
router.get(
  '/slots/:id/signups',
  authenticate,
  allowRoles('Manager', 'Admin'),
  idParam,
  validate(schema.listQuery, 'query'),
  asyncHandler(async (req, res) => {
    const slot = await Slot.findById(req.params.id);
    if (!slot || (req.user.role !== 'Admin' && slot.department !== req.user.department))
      throw new AppError(404, 'NOT_FOUND', 'Slot not found.');
    const { page, limit, status } = req.query;
    const filter = { slot: slot.id, ...(status ? { status } : {}) };
    const [signups, total] = await Promise.all([
      Signup.find(filter)
        .populate('employee', 'name email department')
        .sort({ createdAt: 1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Signup.countDocuments(filter),
    ]);
    res.json({ data: signups, meta: pageInfo(page, limit, total) });
  }),
);
router.patch(
  '/signups/:id/decision',
  authenticate,
  allowRoles('Manager', 'Admin'),
  idParam,
  validate(schema.decision),
  asyncHandler(async (req, res) =>
    res.json({ data: await slotService.decide(req.user, req.params.id, req.body.decision) }),
  ),
);
router.delete(
  '/signups/:id',
  authenticate,
  allowRoles('Employee'),
  idParam,
  asyncHandler(async (req, res) =>
    res.json({ data: await slotService.withdraw(req.user, req.params.id) }),
  ),
);

router.get(
  '/me/signups',
  authenticate,
  allowRoles('Employee'),
  validate(schema.listQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const [items, total] = await Promise.all([
      Signup.find({ employee: req.user.id })
        .populate('slot')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Signup.countDocuments({ employee: req.user.id }),
    ]);
    const now = new Date();
    const week = istWeekBounds(now);
    const approved = await Signup.find({ employee: req.user.id, status: 'approved' }).populate(
      'slot',
      'startAt endAt',
    );
    const weeklyHours = approved.reduce(
      (sum, item) =>
        item.slot.startAt >= week.start && item.slot.startAt < week.end
          ? sum + (item.slot.endAt - item.slot.startAt) / 3600000
          : sum,
      0,
    );
    res.json({
      data: items,
      summary: { weeklyHours, weeklyCap: req.user.weeklyCap },
      meta: pageInfo(page, limit, total),
    });
  }),
);

router.get(
  '/reports/monthly',
  authenticate,
  allowRoles('Manager', 'Admin'),
  validate(schema.reportQuery, 'query'),
  asyncHandler(async (req, res) => {
    const [year, month] = req.query.month.split('-').map(Number);
    const start = parseSlot(`${year}-${String(month).padStart(2, '0')}-01`, '00:00');
    const end = parseSlot(
      month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, '0')}-01`,
      '00:00',
    );
    const pipeline = [
      { $match: { status: 'approved' } },
      { $lookup: { from: 'slots', localField: 'slot', foreignField: '_id', as: 'slot' } },
      { $unwind: '$slot' },
      {
        $match: {
          'slot.startAt': { $gte: start, $lt: end },
          ...(req.user.role === 'Manager' ? { 'slot.department': req.user.department } : {}),
        },
      },
      { $lookup: { from: 'users', localField: 'employee', foreignField: '_id', as: 'employee' } },
      { $unwind: '$employee' },
      {
        $group: {
          _id: {
            employeeId: '$employee._id',
            name: '$employee.name',
            email: '$employee.email',
            department: '$slot.department',
          },
          hours: { $sum: { $divide: [{ $subtract: ['$slot.endAt', '$slot.startAt'] }, 3600000] } },
          shifts: { $sum: 1 },
        },
      },
      { $sort: { '_id.department': 1, '_id.name': 1 } },
    ];
    const rows = await Signup.aggregate(pipeline);
    const allRows = rows.map((row) => ({
      employeeId: row._id.employeeId,
      name: row._id.name,
      email: row._id.email,
      department: row._id.department,
      hours: Math.round(row.hours * 100) / 100,
      shifts: row.shifts,
    }));
    if (req.query.format === 'csv') {
      const quote = (value) => {
        const safeValue = /^[=+\-@\t\r]/.test(String(value ?? '')) ? `'${value}` : value;
        return `"${String(safeValue ?? '').replace(/"/g, '""')}"`;
      };
      const csv = [
        'Employee,Email,Department,Hours,Shifts',
        ...allRows.map((row) =>
          [row.name, row.email, row.department, row.hours, row.shifts].map(quote).join(','),
        ),
      ].join('\r\n');
      res.type('text/csv').attachment(`ot-report-${req.query.month}.csv`).send(csv);
      return;
    }
    const { page, limit } = req.query;
    const data = allRows.slice((page - 1) * limit, page * limit);
    res.json({
      data,
      summary: {
        employees: allRows.length,
        hours: Math.round(allRows.reduce((sum, item) => sum + item.hours, 0) * 100) / 100,
      },
      meta: pageInfo(page, limit, allRows.length),
    });
  }),
);

router.get(
  '/audit-logs',
  authenticate,
  allowRoles('Admin'),
  validate(schema.listQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const [logs, total] = await Promise.all([
      AuditLog.find()
        .populate('actor', 'name email role')
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLog.countDocuments(),
    ]);
    res.json({ data: logs, meta: pageInfo(page, limit, total) });
  }),
);

module.exports = router;

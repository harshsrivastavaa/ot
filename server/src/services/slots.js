const Slot = require('../models/Slot');
const Signup = require('../models/Signup');
const User = require('../models/User');
const { AppError } = require('../utils/errors');
const { parseSlot, istDateString, istTimeString, istWeekBounds } = require('../utils/time');
const { recordAudit } = require('./audit');

function checkApproval({ employee, slot, approvedSignups, occupied, now = new Date() }) {
  if (slot.status === 'cancelled' || slot.startAt <= now)
    throw new AppError(409, 'SLOT_UNAVAILABLE', 'This slot can no longer be approved.');
  const week = istWeekBounds(slot.startAt);
  let hours = 0;
  for (const signup of approvedSignups) {
    if (signup.slot.startAt >= week.start && signup.slot.startAt < week.end) {
      if (slot.startAt < signup.slot.endAt && signup.slot.startAt < slot.endAt)
        throw new AppError(
          409,
          'OVERLAPPING_SLOT',
          'This employee already has an overlapping approved slot.',
        );
      hours += (signup.slot.endAt - signup.slot.startAt) / 3600000;
    }
  }
  const slotHours = (slot.endAt - slot.startAt) / 3600000;
  if (hours + slotHours > employee.weeklyCap)
    throw new AppError(
      409,
      'WEEKLY_CAP',
      'Approving this slot would exceed the employee’s weekly overtime cap.',
    );
  if (occupied >= slot.requiredHeadcount)
    throw new AppError(409, 'HEADCOUNT_FULL', 'This slot has reached its required headcount.');
  return {
    status: occupied + 1 >= slot.requiredHeadcount ? 'full' : 'open',
    weeklyHoursAfter: hours + slotHours,
  };
}

function slotTimes(date, startTime, endTime) {
  const startAt = parseSlot(date, startTime);
  const endAt = parseSlot(date, endTime);
  if (!startAt || !endAt) throw new AppError(400, 'INVALID_TIME', 'Enter a valid date and time.');
  const now = new Date();
  if (startAt <= now)
    throw new AppError(400, 'SLOT_NOT_FUTURE', 'The slot must start in the future.');
  const duration = endAt - startAt;
  if (duration <= 0 || duration > 6 * 60 * 60 * 1000)
    throw new AppError(
      400,
      'INVALID_DURATION',
      'The slot must end after it starts and last no more than six hours.',
    );
  return { startAt, endAt };
}

async function createSlot(user, input) {
  const department = user.role === 'Admin' ? input.department : user.department;
  if (!department) throw new AppError(400, 'DEPARTMENT_REQUIRED', 'A department is required.');
  const times = slotTimes(input.date, input.startTime, input.endTime);
  const slot = await Slot.create({
    title: input.title,
    department,
    ...times,
    requiredHeadcount: input.requiredHeadcount,
    createdBy: user.id,
  });
  return slot;
}

async function updateSlot(user, slotId, input) {
  const slot = await Slot.findById(slotId);
  if (!slot) throw new AppError(404, 'NOT_FOUND', 'Slot not found.');
  if (user.role !== 'Admin' && slot.department !== user.department)
    throw new AppError(404, 'NOT_FOUND', 'Slot not found.');
  if (slot.status === 'cancelled')
    throw new AppError(409, 'SLOT_CANCELLED', 'Cancelled slots cannot be changed.');
  const approved = await Signup.exists({ slot: slot.id, status: 'approved' });
  const changesTime = input.date || input.startTime || input.endTime;
  if (approved && changesTime)
    throw new AppError(
      409,
      'APPROVED_SIGNUPS',
      'A slot with approved signups cannot have its date or time changed.',
    );
  const startAt =
    input.date || input.startTime
      ? parseSlot(
          input.date || istDateString(slot.startAt),
          input.startTime || istTimeString(slot.startAt),
        )
      : slot.startAt;
  const endAt =
    input.date || input.endTime
      ? parseSlot(
          input.date || istDateString(slot.endAt),
          input.endTime || istTimeString(slot.endAt),
        )
      : slot.endAt;
  if (
    !startAt ||
    !endAt ||
    startAt <= new Date() ||
    endAt <= startAt ||
    endAt - startAt > 6 * 3600000
  )
    throw new AppError(
      400,
      'INVALID_TIME',
      'The updated slot must be in the future, on one date, and last no more than six hours.',
    );
  const previous = {
    title: slot.title,
    startAt: slot.startAt,
    endAt: slot.endAt,
    requiredHeadcount: slot.requiredHeadcount,
  };
  if (input.title) slot.title = input.title;
  slot.startAt = startAt;
  slot.endAt = endAt;
  if (input.requiredHeadcount !== undefined) slot.requiredHeadcount = input.requiredHeadcount;
  const occupied = await Signup.countDocuments({ slot: slot.id, status: 'approved' });
  if (slot.requiredHeadcount < occupied)
    throw new AppError(
      409,
      'HEADCOUNT_BELOW_OCCUPANCY',
      'Headcount cannot be lower than the number of approved employees.',
    );
  slot.status = occupied >= slot.requiredHeadcount ? 'full' : 'open';
  await slot.save();
  await recordAudit({
    actor: user.id,
    action: 'slot.updated',
    entityType: 'slot',
    entityId: slot.id,
    before: previous,
    after: {
      title: slot.title,
      startAt: slot.startAt,
      endAt: slot.endAt,
      requiredHeadcount: slot.requiredHeadcount,
    },
  });
  return slot;
}

async function cancelSlot(user, slotId) {
  const slot = await Slot.findById(slotId);
  if (!slot || (user.role !== 'Admin' && slot.department !== user.department))
    throw new AppError(404, 'NOT_FOUND', 'Slot not found.');
  if (slot.status === 'cancelled') return slot;
  const before = { status: slot.status };
  slot.status = 'cancelled';
  await slot.save();
  const active = await Signup.find({
    slot: slot.id,
    status: { $in: ['pending', 'approved'] },
  });
  for (const signup of active) {
    const previous = { status: signup.status };
    signup.status = 'cancelled';
    signup.active = false;
    signup.decidedBy = user.id;
    signup.decidedAt = new Date();
    await signup.save();
    await recordAudit({
      actor: user.id,
      action: 'signup.cancelled',
      entityType: 'signup',
      entityId: signup.id,
      before: previous,
      after: { status: 'cancelled' },
    });
  }
  await recordAudit({
    actor: user.id,
    action: 'slot.cancelled',
    entityType: 'slot',
    entityId: slot.id,
    before,
    after: { status: 'cancelled', cancelledSignups: active.length },
  });
  return slot;
}

async function signup(user, slotId) {
  const slot = await Slot.findById(slotId);
  if (!slot || slot.department !== user.department)
    throw new AppError(404, 'NOT_FOUND', 'Slot not found.');
  if (slot.status !== 'open' || slot.startAt <= new Date())
    throw new AppError(409, 'SLOT_UNAVAILABLE', 'This slot is no longer available.');
  const existing = await Signup.findOne({
    slot: slot.id,
    employee: user.id,
    status: { $in: ['pending', 'approved'] },
  });
  if (existing)
    throw new AppError(409, 'DUPLICATE_SIGNUP', 'You already have an active signup for this slot.');
  try {
    return await Signup.create({ slot: slot.id, employee: user.id });
  } catch (error) {
    if (error.code === 11000)
      throw new AppError(
        409,
        'DUPLICATE_SIGNUP',
        'You already have an active signup for this slot.',
      );
    throw error;
  }
}

async function decide(user, signupId, choice) {
  const signup = await Signup.findById(signupId).populate('slot');
  if (!signup || (user.role !== 'Admin' && signup.slot.department !== user.department))
    throw new AppError(404, 'NOT_FOUND', 'Signup not found.');
  if (signup.status !== 'pending')
    throw new AppError(409, 'SIGNUP_DECIDED', 'This signup has already been decided.');
  const before = { status: signup.status };
  if (choice === 'rejected') {
    signup.status = 'rejected';
    signup.active = false;
  } else {
    const employeeId = signup.employee;
    const employee = await User.findByIdAndUpdate(
      employeeId,
      { $inc: { approvalVersion: 1 } },
      { new: true },
    );
    const slot = await Slot.findById(signup.slot.id);
    if (!employee || !slot)
      throw new AppError(409, 'SLOT_UNAVAILABLE', 'This slot can no longer be approved.');
    const current = await Signup.find({ employee: employeeId, status: 'approved' }).populate('slot');
    const occupied = await Signup.countDocuments({ slot: slot.id, status: 'approved' });
    const nextState = checkApproval({ employee, slot, approvedSignups: current, occupied });
    signup.status = 'approved';
    slot.status = nextState.status;
    await slot.save();
  }
  signup.decidedBy = user.id;
  signup.decidedAt = new Date();
  await signup.save();
  await recordAudit({
    actor: user.id,
    action: `signup.${signup.status}`,
    entityType: 'signup',
    entityId: signup.id,
    before,
    after: { status: signup.status },
  });
  return signup;
}

async function withdraw(user, signupId) {
  const signup = await Signup.findOne({ _id: signupId, employee: user.id }).populate('slot');
  if (!signup) throw new AppError(404, 'NOT_FOUND', 'Signup not found.');
  if (!['pending', 'approved'].includes(signup.status))
    throw new AppError(409, 'SIGNUP_CLOSED', 'This signup can no longer be withdrawn.');
  if (
    signup.status === 'approved' &&
    new Date() >= new Date(signup.slot.startAt.getTime() - 24 * 3600000)
  )
    throw new AppError(
      409,
      'WITHDRAWAL_CUTOFF',
      'Approved signups cannot be withdrawn within 24 hours of the slot.',
    );
  const before = { status: signup.status };
  const wasApproved = signup.status === 'approved';
  signup.status = 'withdrawn';
  signup.active = false;
  signup.decidedAt = new Date();
  signup.decidedBy = user.id;
  await signup.save();
  if (wasApproved) {
    const slot = await Slot.findById(signup.slot.id);
    if (slot && slot.status !== 'cancelled') {
      slot.status = 'open';
      await slot.save();
      }
  }
  await recordAudit({
    actor: user.id,
    action: 'signup.withdrawn',
    entityType: 'signup',
    entityId: signup.id,
    before,
    after: { status: 'withdrawn' },
  });
  return signup;
}

module.exports = {
  createSlot,
  updateSlot,
  cancelSlot,
  signup,
  decide,
  withdraw,
  slotTimes,
  checkApproval,
};

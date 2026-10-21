const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const User = require('../models/User');
const { checkApproval } = require('../services/slots');
const { AppError } = require('../utils/errors');
const { login: loginSchema, userCreate } = require('../validators/schemas');
const app = require('../app');

function slot(start, end, headcount = 2, status = 'open') {
  return { startAt: new Date(start), endAt: new Date(end), requiredHeadcount: headcount, status };
}

describe('OT Hub business rules', () => {
  afterEach(() => jest.restoreAllMocks());

  test('failed login returns a generic credential error', async () => {
    const passwordHash = await bcrypt.hash('a-correct-password', 4);
    jest
      .spyOn(User, 'findOne')
      .mockReturnValue({ select: async () => ({ passwordHash, active: true }) });
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'worker@example.com', password: 'wrong-password' });
    expect(response.status).toBe(401);
    expect(response.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect.',
    });
  });

  test('a user with the wrong role is denied by a protected API route', async () => {
    jest
      .spyOn(User, 'findById')
      .mockResolvedValue({ id: '507f1f77bcf86cd799439011', role: 'Employee', active: true });
    const token = jwt.sign({ sub: '507f1f77bcf86cd799439011' }, process.env.JWT_SECRET);
    const response = await request(app).get('/api/users').set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
  });

  test('overlapping approved slots are rejected, including partial overlaps', () => {
    const candidate = slot('2026-11-02T11:00:00Z', '2026-11-02T14:00:00Z');
    const existing = { slot: slot('2026-11-02T13:00:00Z', '2026-11-02T15:00:00Z') };
    expect(() =>
      checkApproval({
        employee: { weeklyCap: 12 },
        slot: candidate,
        approvedSignups: [existing],
        occupied: 0,
        now: new Date('2026-10-01'),
      }),
    ).toThrow(AppError);
    expect(() =>
      checkApproval({
        employee: { weeklyCap: 12 },
        slot: candidate,
        approvedSignups: [existing],
        occupied: 0,
        now: new Date('2026-10-01'),
      }),
    ).toThrow(/overlapping/);
  });

  test('approval that crosses the weekly cap is rejected', () => {
    const candidate = slot('2026-11-02T10:00:00Z', '2026-11-02T14:00:00Z');
    const existing = { slot: slot('2026-11-03T10:00:00Z', '2026-11-03T19:00:00Z') };
    expect(() =>
      checkApproval({
        employee: { weeklyCap: 12 },
        slot: candidate,
        approvedSignups: [existing],
        occupied: 0,
        now: new Date('2026-10-01'),
      }),
    ).toThrow(/weekly overtime cap/);
  });

  test('approval cannot exceed slot headcount', () => {
    const candidate = slot('2026-11-02T10:00:00Z', '2026-11-02T12:00:00Z', 1);
    expect(() =>
      checkApproval({
        employee: { weeklyCap: 12 },
        slot: candidate,
        approvedSignups: [],
        occupied: 1,
        now: new Date('2026-10-01'),
      }),
    ).toThrow(/required headcount/);
  });

  test('touching endpoints remain eligible and the last place fills the slot', () => {
    const candidate = slot('2026-11-02T12:00:00Z', '2026-11-02T14:00:00Z', 2);
    const existing = { slot: slot('2026-11-02T10:00:00Z', '2026-11-02T12:00:00Z') };
    expect(
      checkApproval({
        employee: { weeklyCap: 12 },
        slot: candidate,
        approvedSignups: [existing],
        occupied: 1,
        now: new Date('2026-10-01'),
      }),
    ).toMatchObject({ status: 'full', weeklyHoursAfter: 4 });
  });

  test('employee and manager accounts must have a department', () => {
    const { error } = userCreate.validate({
      name: 'Worker',
      email: 'worker@example.com',
      password: 'long-demo-password',
      role: 'Employee',
    });
    expect(error).toBeDefined();
  });

  test('login accepts the seeded local address and trims surrounding whitespace', () => {
    const { value, error } = loginSchema.validate({
      email: ' admin@ot-hub.local ',
      password: 'long-demo-password',
    });
    expect(error).toBeUndefined();
    expect(value.email).toBe('admin@ot-hub.local');
    expect(
      loginSchema.validate({ email: 'admin@other.local', password: 'long-demo-password' }).error,
    ).toBeDefined();
  });
});

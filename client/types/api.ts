export type UserRole = 'Employee' | 'Manager' | 'Admin';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string | null;
  weeklyCap: number;
};

export type Slot = {
  _id: string;
  title: string;
  department: string;
  startAt: string;
  endAt: string;
  requiredHeadcount: number;
  status: 'open' | 'full' | 'cancelled';
  approvedHeadcount?: number;
  totalHeadcount?: number;
  availableHeadcount?: number;
  signups?: Signup[];
  mySignup?: Pick<Signup, '_id' | 'status'> | null;
};

export type Signup = {
  _id: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'cancelled';
  slot: Slot;
  employee?: Pick<User, 'name' | 'email'>;
};

export type ApiList<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; pages: number };
};

export type MonthlyReportRow = {
  employeeId: string;
  name: string;
  email: string;
  department: string;
  hours: number;
  shifts: number;
};

export type AuditEntry = {
  _id: string;
  action: string;
  entityType: string;
  createdAt: string;
  actor?: Pick<User, 'name' | 'email' | 'role'>;
};




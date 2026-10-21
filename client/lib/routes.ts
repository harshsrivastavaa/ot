import type { UserRole } from '@/types/api';

export const homeForRole: Record<UserRole, string> = {
  Employee: '/employee/open-slots',
  Manager: '/manager/slots',
  Admin: '/admin/users',
};

export const navigationForRole: Record<UserRole, Array<{ label: string; href: string }>> = {
  Employee: [
    { label: 'Open slots', href: '/employee/open-slots' },
    { label: 'My overtime', href: '/employee/overtime' },
  ],
  Manager: [
    { label: 'Slots', href: '/manager/slots' },
    { label: 'Signup review', href: '/manager/reviews' },
    { label: 'Monthly report', href: '/manager/reports' },
  ],
  Admin: [
    { label: 'Users', href: '/admin/users' },
    { label: 'Monthly report', href: '/admin/reports' },
    { label: 'Audit log', href: '/admin/audit-logs' },
  ],
};

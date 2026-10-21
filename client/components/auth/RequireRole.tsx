'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { homeForRole } from '@/lib/routes';
import { useAuth } from '@/components/auth/AuthProvider';
import type { UserRole } from '@/types/api';

export function RequireRole({ roles, children }: { roles: UserRole[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const allowed = Boolean(user && roles.includes(user.role));

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    else if (!loading && user && !allowed) router.replace(homeForRole[user.role]);
  }, [allowed, loading, router, user]);

  if (loading || !allowed)
    return (
      <div className="shell">
        <p className="muted">Checking access…</p>
      </div>
    );
  return <>{children}</>;
}

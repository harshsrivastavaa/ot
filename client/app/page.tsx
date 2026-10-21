'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { homeForRole } from '@/lib/routes';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? homeForRole[user.role] : '/login');
  }, [loading, router, user]);

  return (
    <main className="shell">
      <p className="muted" role="status">
        Opening your OT Hub…
      </p>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { navigationForRole } from '@/lib/routes';

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, router, user]);

  if (loading || !user)
    return (
      <main className="shell">
        <p className="muted">Loading your workspace…</p>
      </main>
    );

  return (
    <main className="shell">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to page content
      </a>
      <header className="topbar">
        <Link href="/" className="brand" aria-label="OT Hub home">
          OT <span>Hub</span>
        </Link>
        <div className="row">
          <div style={{ textAlign: 'right' }}>
            <div>{user.name}</div>
            <div className="muted" style={{ fontSize: 13 }}>
              {user.role}
              {user.department ? ` · ${user.department}` : ''}
            </div>
          </div>
          <button
            className="btn secondary"
            onClick={() => {
              signOut();
              router.replace('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <nav className="tabs" aria-label="Workspace sections">
        {navigationForRole[user.role].map((item) => (
          <Link
            key={item.href}
            className="tab"
            aria-current={pathname === item.href ? 'page' : undefined}
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div id="main-content">{children}</div>
    </main>
  );
}

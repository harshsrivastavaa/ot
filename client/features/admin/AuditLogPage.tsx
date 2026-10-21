'use client';

import { useEffect, useState } from 'react';
import { RequireRole } from '@/components/auth/RequireRole';
import { EmptyMessage, ErrorMessage, LoadingMessage, PageHeading } from '@/components/ui/Feedback';
import { getApiErrorMessage } from '@/lib/api';
import { listAuditEntries } from '@/services/auditService';
import type { AuditEntry } from '@/types/api';

function formatTime(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

export function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listAuditEntries({ limit: 100 })
      .then((result) => setEntries(result.data))
      .catch((requestError) => setError(getApiErrorMessage(requestError)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <RequireRole roles={['Admin']}>
      <PageHeading
        title="Audit log"
        description="Recent overtime decisions, cancellations, and account changes."
      />
      <ErrorMessage>{error}</ErrorMessage>
      <section className="panel">
        {loading ? (
          <LoadingMessage>Loading activity…</LoadingMessage>
        ) : entries.length === 0 ? (
          <EmptyMessage>No activity has been recorded yet.</EmptyMessage>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id}>
                    <td>{formatTime(entry.createdAt)}</td>
                    <td>{entry.actor?.name || '—'}</td>
                    <td>{entry.action}</td>
                    <td>{entry.entityType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </RequireRole>
  );
}

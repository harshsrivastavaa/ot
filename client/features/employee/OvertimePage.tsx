'use client';

import { useCallback, useEffect, useState } from 'react';
import { RequireRole } from '@/components/auth/RequireRole';
import { EmptyMessage, ErrorMessage, LoadingMessage, PageHeading } from '@/components/ui/Feedback';
import { getApiErrorMessage } from '@/lib/api';
import { listMySignups, withdrawSignup } from '@/services/slotsService';
import type { Signup } from '@/types/api';

function formatStart(value?: string) {
  return value
    ? new Date(value).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      })
    : '—';
}

export function OvertimePage() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [weeklyCap, setWeeklyCap] = useState(12);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const result = await listMySignups({ limit: 100 });
      setSignups(result.data);
      setWeeklyHours(result.summary.weeklyHours);
      setWeeklyCap(result.summary.weeklyCap);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function withdraw(id: string) {
    setBusyId(id);
    setError('');
    setNotice('');
    try {
      await withdrawSignup(id);
      setNotice('Signup withdrawn.');
      await load();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusyId('');
    }
  }

  const progress = weeklyCap > 0 ? Math.min(100, (weeklyHours / weeklyCap) * 100) : 0;

  return (
    <RequireRole roles={['Employee']}>
      <PageHeading
        title="My overtime"
        description="Track this week’s approved hours and review your signup history."
      />
      {notice && (
        <p className="panel" role="status" style={{ padding: 12 }}>
          {notice}
        </p>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="split">
          <h2 style={{ margin: 0 }}>This week</h2>
          <strong>
            {weeklyHours.toFixed(1)} / {weeklyCap} hours
          </strong>
        </div>
        <div
          role="progressbar"
          aria-label="Weekly overtime cap used"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ height: 9, borderRadius: 8, background: '#e8eee9', marginTop: 15 }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              borderRadius: 8,
              background: progress >= 100 ? '#a7433d' : '#43835d',
            }}
          />
        </div>
      </section>
      <section className="panel">
        <h2>Signup history</h2>
        {loading ? (
          <LoadingMessage>Loading your signups…</LoadingMessage>
        ) : signups.length === 0 ? (
          <EmptyMessage>Your signups will appear here.</EmptyMessage>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>When</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {signups.map((signup) => (
                  <tr key={signup._id}>
                    <td>{signup.slot?.title || 'Removed slot'}</td>
                    <td>{formatStart(signup.slot?.startAt)}</td>
                    <td>
                      <span className="status">{signup.status}</span>
                    </td>
                    <td>
                      {['pending', 'approved'].includes(signup.status) && (
                        <button
                          className="btn secondary"
                          disabled={busyId === signup._id}
                          onClick={() => void withdraw(signup._id)}
                        >
                          {busyId === signup._id ? 'Working…' : 'Withdraw'}
                        </button>
                      )}
                    </td>
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

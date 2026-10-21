'use client';

import { useCallback, useEffect, useState } from 'react';
import { RequireRole } from '@/components/auth/RequireRole';
import { EmptyMessage, ErrorMessage, LoadingMessage, PageHeading } from '@/components/ui/Feedback';
import { getApiErrorMessage } from '@/lib/api';
import { listSlots, markAvailable, withdrawSignup } from '@/services/slotsService';
import type { Slot } from '@/types/api';

function formatStart(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

export function OpenSlotsPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');

  const loadSlots = useCallback(async () => {
    setError('');
    try {
      const result = await listSlots({ limit: 100 });
      setSlots(result.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSlots();
    const interval = window.setInterval(() => void loadSlots(), 15000);
    return () => window.clearInterval(interval);
  }, [loadSlots]);

  async function sendAvailability(slotId: string) {
    setBusyId(slotId);
    setError('');
    setNotice('');
    try {
      await markAvailable(slotId);
      setNotice('Your signup was sent to the manager.');
      await loadSlots();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusyId('');
    }
  }

  async function withdraw(slot: Slot) {
    if (!slot.mySignup) return;
    setBusyId(slot._id);
    setError('');
    setNotice('');
    try {
      await withdrawSignup(slot.mySignup._id);
      setNotice('Your signup was withdrawn.');
      await loadSlots();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusyId('');
    }
  }

  return (
    <RequireRole roles={['Employee']}>
      <PageHeading
        title="Open overtime slots"
        description="Browse open shifts, track your signup status, and see current headcount. This list refreshes automatically."
      />
      {notice && (
        <p className="panel" role="status" style={{ padding: 12 }}>
          {notice}
        </p>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      {loading ? (
        <LoadingMessage>Loading open shifts...</LoadingMessage>
      ) : slots.length === 0 ? (
        <EmptyMessage>No open slots are available right now.</EmptyMessage>
      ) : (
        <div className="grid">
          {slots.map((slot) => {
            const signupStatus = slot.mySignup?.status;
            const hasActiveSignup = signupStatus === 'pending' || signupStatus === 'approved';
            return (
              <article className="panel stack" key={slot._id}>
                <div className="split">
                  <h2 style={{ margin: 0 }}>{slot.title}</h2>
                  <span className="status">{signupStatus || slot.status}</span>
                </div>
                <div className="muted">{slot.department}</div>
                <div>
                  {formatStart(slot.startAt)} -{' '}
                  {new Date(slot.endAt).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Kolkata',
                  })}
                </div>
                <div>
                  Approved headcount: {slot.approvedHeadcount ?? 0} /{' '}
                  {slot.totalHeadcount ?? slot.requiredHeadcount}
                </div>
                <div className="muted">
                  {slot.availableHeadcount ??
                    Math.max(slot.requiredHeadcount - (slot.approvedHeadcount ?? 0), 0)}{' '}
                  places remaining
                </div>
                {signupStatus ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Your request: {signupStatus}
                  </p>
                ) : hasActiveSignup ? (
                  <button
                    className="btn secondary"
                    disabled={busyId === slot._id}
                    onClick={() => void withdraw(slot)}
                  >
                    {busyId === slot._id ? 'Working...' : 'Withdraw signup'}
                  </button>
                ) : (
                  <button
                    className="btn"
                    disabled={busyId === slot._id || slot.status !== 'open'}
                    onClick={() => void sendAvailability(slot._id)}
                  >
                    {busyId === slot._id ? 'Sending...' : 'Mark available'}
                  </button>
                )}
           </article>
            );
          })}
        </div>
      )}
    </RequireRole>
  );
}

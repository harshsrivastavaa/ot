'use client';

import { useEffect, useState } from 'react';
import { RequireRole } from '@/components/auth/RequireRole';
import { EmptyMessage, ErrorMessage, LoadingMessage, PageHeading } from '@/components/ui/Feedback';
import { getApiErrorMessage } from '@/lib/api';
import { decideSignup, listSlotSignups, listSlots } from '@/services/slotsService';
import type { Signup, Slot } from '@/types/api';

function formatStart(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

export function SignupReviewPage() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingSignups, setLoadingSignups] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    listSlots({ limit: 100 })
      .then((result) => {
        setSlots(result.data);
        setSelectedSlot(result.data[0]?._id || '');
      })
      .catch((requestError) => setError(getApiErrorMessage(requestError)))
      .finally(() => setLoadingSlots(false));
  }, []);

  useEffect(() => {
    if (!selectedSlot) {
      setSignups([]);
      return;
    }
    let active = true;
    setLoadingSignups(true);
    setError('');
    listSlotSignups(selectedSlot, { status: 'pending', limit: 100 })
      .then((result) => {
        if (active) setSignups(result.data);

        console.log('Signups for slot', selectedSlot, result.data);
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoadingSignups(false);
      });
    return () => {
      active = false;
    };
  }, [selectedSlot]);

  async function decide(signupId: string, choice: 'approved' | 'rejected') {
    setBusyId(signupId);
    setError('');
    setNotice('');
    try {
      await decideSignup(signupId, choice);
      setNotice(choice === 'approved' ? 'Signup approved.' : 'Signup declined.');
      const result = await listSlotSignups(selectedSlot, { status: 'pending', limit: 100 });
      setSignups(result.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusyId('');
    }
  }

  return (
    <RequireRole roles={['Manager']}>
      <PageHeading
        title="Signup review"
        description="Review employee availability requests for your department’s shifts."
      />
      {notice && (
        <p className="panel" role="status" style={{ padding: 12 }}>
          {notice}
        </p>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      <section className="panel">
        <div className="field" style={{ maxWidth: 560, marginBottom: 20 }}>
          <label htmlFor="review-slot">Choose a slot</label>
          <select
            id="review-slot"
            value={selectedSlot}
            onChange={(event) => setSelectedSlot(event.target.value)}
            disabled={loadingSlots || slots.length === 0}
          >
            <option value="">Select a slot</option>
            {slots.map((slot) => (
              <option key={slot._id} value={slot._id}>
                {slot.title} · {formatStart(slot.startAt)}
              </option>
            ))}
          </select>
        </div>
        {loadingSlots || loadingSignups ? (
          <LoadingMessage>Loading signup requests…</LoadingMessage>
        ) : !selectedSlot ? (
          <EmptyMessage>No department slots are available to review.</EmptyMessage>
        ) : signups.length === 0 ? (
          <EmptyMessage>No pending requests for this slot.</EmptyMessage>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Email</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {signups.map((signup) => (
                  <tr key={signup._id}>
                    <td>{signup.employee?.name || 'Employee'}</td>
                    <td>{signup.employee?.email || '—'}</td>
                    <td className="row">
                      <button
                        className="btn"
                        disabled={!!busyId}
                        onClick={() => void decide(signup._id, 'approved')}
                      >
                        Approve
                      </button>
                      <button
                        className="btn secondary"
                        disabled={!!busyId}
                        onClick={() => void decide(signup._id, 'rejected')}
                      >
                        Decline
                      </button>
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

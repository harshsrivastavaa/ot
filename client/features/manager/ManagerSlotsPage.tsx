'use client';

import { useCallback, useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { RequireRole } from '@/components/auth/RequireRole';
import { EmptyMessage, ErrorMessage, LoadingMessage, PageHeading } from '@/components/ui/Feedback';
import { getApiErrorMessage } from '@/lib/api';
import { cancelSlot, createSlot, listSlots, updateSlot } from '@/services/slotsService';
import type { Slot } from '@/types/api';
import { useAuth } from '@/components/auth/AuthProvider';

function todayInIndia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
function istDate(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}
function istTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(value));
}
function formatStart(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });
}

const slotFields = Yup.object({
  title: Yup.string().trim().required('Add a shift title.'),
  date: Yup.string().required('Choose a date.'),
  startTime: Yup.string().required('Choose a start time.'),
  endTime: Yup.string().required('Choose an end time.'),
  requiredHeadcount: Yup.number()
    .integer()
    .min(1)
    .max(50)
    .required('Enter how many people are needed.'),
}).test(
  'duration',
  'The shift must end after it starts and last no more than six hours.',
  (values) => {
    if (!values?.date || !values.startTime || !values.endTime) return true;
    const start = new Date(`${values.date}T${values.startTime}:00+05:30`).getTime();
    const end = new Date(`${values.date}T${values.endTime}:00+05:30`).getTime();
    return end > start && end - start <= 6 * 60 * 60 * 1000;
  },
);

export function ManagerSlotsPage() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState('');
  const today = todayInIndia();

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
  }, [loadSlots]);

  async function handleCancel(slot: Slot) {
    if (!window.confirm(`Cancel “${slot.title}” and close its active signups?`)) return;
    setBusyId(slot._id);
    setError('');
    setNotice('');
    try {
      await cancelSlot(slot._id);
      setNotice('Slot cancelled and active signups closed.');
      await loadSlots();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setBusyId('');
    }
  }

  return (
    <RequireRole roles={['Manager']}>
      <PageHeading
        title="Department slots"
        description="Create and maintain overtime shifts for your department."
      />
      {notice && (
        <p className="panel" role="status" style={{ padding: 12 }}>
          {notice}
        </p>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Create a slot</h2>
        <Formik
          initialValues={{
            title: '',
            date: today,
            startTime: '17:00',
            endTime: '20:00',
            requiredHeadcount: 1,
            department: user?.department || '',
          }}
          validationSchema={slotFields}
          onSubmit={async (values, helpers) => {
            setError('');
            setNotice('');
            try {
              await createSlot({ ...values, requiredHeadcount: Number(values.requiredHeadcount) });
              helpers.resetForm({ values: { ...values, title: '' } });
              setNotice('Slot created.');
              await loadSlots();
            } catch (requestError) {
              setError(getApiErrorMessage(requestError));
            } finally {
              helpers.setSubmitting(false);
            }
          }}
        >
          {({ errors, touched, isSubmitting }) => (
            <Form className="grid">
              <div className="field">
                <label htmlFor="title">Shift title</label>
                <Field id="title" name="title" placeholder="Packing line support" />
                {touched.title && errors.title && <small className="error">{errors.title}</small>}
              </div>
              <div className="field">
                <label htmlFor="date">Date</label>
                <Field id="date" name="date" type="date" min={today} />
                {touched.date && errors.date && <small className="error">{errors.date}</small>}
              </div>
              <div className="field">
                <label htmlFor="startTime">Starts</label>
                <Field id="startTime" name="startTime" type="time" />
                {touched.startTime && errors.startTime && (
                  <small className="error">{errors.startTime}</small>
                )}
              </div>
              <div className="field">
                <label htmlFor="endTime">Ends</label>
                <Field id="endTime" name="endTime" type="time" />
                {touched.endTime && errors.endTime && (
                  <small className="error">{errors.endTime}</small>
                )}
              </div>
              <div className="field">
                <label htmlFor="requiredHeadcount">People needed</label>
                <Field
                  id="requiredHeadcount"
                  name="requiredHeadcount"
                  type="number"
                  min="1"
                  max="50"
                />
                {touched.requiredHeadcount && errors.requiredHeadcount && (
                  <small className="error">{errors.requiredHeadcount}</small>
                )}
              </div>
              {typeof errors === 'string' && <small className="error">{errors}</small>}
              <div className="field" style={{ alignSelf: 'end' }}>
                <button className="btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating…' : 'Create slot'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </section>
      <section className="panel">
        <h2>Upcoming and past slots</h2>
        {loading ? (
          <LoadingMessage>Loading department slots…</LoadingMessage>
        ) : slots.length === 0 ? (
          <EmptyMessage>No slots have been created yet.</EmptyMessage>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Shift</th>
                  <th>Starts</th>
                  <th>Places</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot._id}>
                    <td>{slot.title}</td>
                    <td>{formatStart(slot.startAt)}</td>
                    <td>{slot.requiredHeadcount}</td>
                    <td>
                      <span className="status">{slot.status}</span>
                    </td>
                    <td className="row">
                      {slot.status !== 'cancelled' && (
                        <>
                          <SlotEditForm
                            slot={slot}
                            onSaved={async () => {
                              setNotice('Slot updated.');
                              await loadSlots();
                            }}
                            onError={setError}
                          />
                          <button
                            className="btn danger"
                            disabled={busyId === slot._id}
                            onClick={() => void handleCancel(slot)}
                          >
                            {busyId === slot._id ? 'Working…' : 'Cancel'}
                          </button>
                        </>
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

function SlotEditForm({
  slot,
  onSaved,
  onError,
}: {
  slot: Slot;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const initialValues = {
    title: slot.title,
    date: istDate(slot.startAt),
    startTime: istTime(slot.startAt),
    endTime: istTime(slot.endAt),
    requiredHeadcount: slot.requiredHeadcount,
  };
  return (
    <details>
      <summary className="btn secondary">Edit</summary>
      <div className="panel" style={{ position: 'absolute', zIndex: 2, width: 330, marginTop: 8 }}>
        <Formik
          initialValues={initialValues}
          validationSchema={slotFields}
          onSubmit={async (values, helpers) => {
            const changes: Record<string, string | number> = {};
            for (const key of Object.keys(initialValues) as (keyof typeof initialValues)[])
              if (values[key] !== initialValues[key]) changes[key] = values[key];
            if (changes.requiredHeadcount !== undefined)
              changes.requiredHeadcount = Number(changes.requiredHeadcount);
            try {
              await updateSlot(slot._id, changes);
              await onSaved();
            } catch (requestError) {
              onError(getApiErrorMessage(requestError));
            } finally {
              helpers.setSubmitting(false);
            }
          }}
        >
          {({ isSubmitting, dirty }) => (
            <Form className="stack">
              <div className="field">
                <label htmlFor={`edit-title-${slot._id}`}>Shift title</label>
                <Field id={`edit-title-${slot._id}`} name="title" />
              </div>
              <div className="field">
                <label htmlFor={`edit-date-${slot._id}`}>Date</label>
                <Field id={`edit-date-${slot._id}`} name="date" type="date" />
              </div>
              <div className="row">
                <div className="field">
                  <label htmlFor={`edit-start-${slot._id}`}>Starts</label>
                  <Field id={`edit-start-${slot._id}`} name="startTime" type="time" />
                </div>
                <div className="field">
                  <label htmlFor={`edit-end-${slot._id}`}>Ends</label>
                  <Field id={`edit-end-${slot._id}`} name="endTime" type="time" />
                </div>
              </div>
              <div className="field">
                <label htmlFor={`edit-headcount-${slot._id}`}>People needed</label>
                <Field
                  id={`edit-headcount-${slot._id}`}
                  name="requiredHeadcount"
                  type="number"
                  min="1"
                  max="50"
                />
              </div>
              <button className="btn" disabled={isSubmitting || !dirty}>
                Save changes
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </details>
  );
}

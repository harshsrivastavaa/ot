'use client';

import { useCallback, useEffect, useState } from 'react';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { RequireRole } from '@/components/auth/RequireRole';
import { EmptyMessage, ErrorMessage, LoadingMessage, PageHeading } from '@/components/ui/Feedback';
import { getApiErrorMessage } from '@/lib/api';
import { changeWeeklyCap, createUser, listUsers } from '@/services/usersService';
import type { User, UserRole } from '@/types/api';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadUsers = useCallback(async () => {
    setError('');
    try {
      const result = await listUsers({ limit: 100 });
      setUsers(result.data);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  return (
    <RequireRole roles={['Admin']}>
      <PageHeading
        title="User management"
        description="Create accounts and set employee overtime caps."
      />
      {notice && (
        <p className="panel" role="status" style={{ padding: 12 }}>
          {notice}
        </p>
      )}
      <ErrorMessage>{error}</ErrorMessage>
      <section className="panel" style={{ marginBottom: 16 }}>
        <h2>Add a user</h2>
        <Formik
          initialValues={{
            name: '',
            email: '',
            password: '',
            role: 'Employee',
            department: '',
            weeklyCap: 12,
          }}
          validationSchema={Yup.object({
            name: Yup.string().trim().required('Enter a name.'),
            email: Yup.string().email('Enter a valid email.').required('Enter an email.'),
            password: Yup.string()
              .min(10, 'Use at least 10 characters.')
              .required('Set a temporary password.'),
            role: Yup.string().oneOf(['Employee', 'Manager', 'Admin']).required(),
            department: Yup.string().when('role', {
              is: (role: string) => role !== 'Admin',
              then: (schema) => schema.trim().required('Enter a department.'),
              otherwise: (schema) => schema.trim(),
            }),
            weeklyCap: Yup.number().min(0).max(60).required('Enter the weekly cap.'),
          })}
          onSubmit={async (values, helpers) => {
            setError('');
            setNotice('');
            try {
              await createUser({
                ...values,
                role: values.role as UserRole,
                weeklyCap: Number(values.weeklyCap),
              });
              helpers.resetForm();
              setNotice('User created. Share the temporary password securely.');
              await loadUsers();
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
                <label htmlFor="name">Name</label>
                <Field id="name" name="name" />
                {touched.name && errors.name && <small className="error">{errors.name}</small>}
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <Field id="email" name="email" type="email" />
                {touched.email && errors.email && <small className="error">{errors.email}</small>}
              </div>
              <div className="field">
                <label htmlFor="password">Temporary password</label>
                <Field id="password" name="password" type="password" />
                {touched.password && errors.password && (
                  <small className="error">{errors.password}</small>
                )}
              </div>
              <div className="field">
                <label htmlFor="role">Role</label>
                <Field id="role" as="select" name="role">
                  <option>Employee</option>
                  <option>Manager</option>
                  <option>Admin</option>
                </Field>
              </div>
              <div className="field">
                <label htmlFor="department">Department</label>
                <Field id="department" name="department" />
                {touched.department && errors.department && (
                  <small className="error">{errors.department}</small>
                )}
              </div>
              <div className="field">
                <label htmlFor="weeklyCap">Weekly cap (hours)</label>
                <Field id="weeklyCap" name="weeklyCap" type="number" min="0" max="60" />
              </div>
              <div className="field" style={{ alignSelf: 'end' }}>
                <button className="btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating…' : 'Create user'}
                </button>
              </div>
            </Form>
          )}
        </Formik>
      </section>
      <section className="panel">
        <h2>Users and weekly caps</h2>
        {loading ? (
          <LoadingMessage>Loading users…</LoadingMessage>
        ) : users.length === 0 ? (
          <EmptyMessage>No users have been created yet.</EmptyMessage>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Weekly cap</th>
                  <th>Update cap</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>{user.department || '—'}</td>
                    <td>{user.weeklyCap}h</td>
                    <td>
                      {user.role === 'Employee' && (
                        <WeeklyCapEditor
                          user={user}
                          onSaved={async () => {
                            setNotice('Weekly cap updated.');
                            await loadUsers();
                          }}
                          onError={setError}
                        />
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

function WeeklyCapEditor({
  user,
  onSaved,
  onError,
}: {
  user: User;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [value, setValue] = useState(String(user.weeklyCap));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 60) {
      onError('Weekly cap must be between 0 and 60 hours.');
      return;
    }
    try {
      await changeWeeklyCap(user.id, parsed);
      await onSaved();
    } catch (requestError) {
      onError(getApiErrorMessage(requestError));
    }
  }

  return (
    <form className="row" onSubmit={(event) => void save(event)}>
      <label className="muted" htmlFor={`cap-${user.id}`}>
        Hours
      </label>
      <input
        id={`cap-${user.id}`}
        aria-label={`Weekly cap for ${user.name}`}
        style={{ width: 75, padding: 7 }}
        type="number"
        min="0"
        max="60"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button className="btn secondary">Save</button>
    </form>
  );
}

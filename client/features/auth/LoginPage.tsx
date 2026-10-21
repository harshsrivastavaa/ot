'use client';

import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { getApiErrorMessage } from '@/lib/api';
import { homeForRole } from '@/lib/routes';
import { ErrorMessage } from '@/components/ui/Feedback';

export function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && user) router.replace(homeForRole[user.role]);
  }, [loading, router, user]);

  return (
    <main className="shell" style={{ maxWidth: 520, paddingTop: '10vh' }}>
      <div className="topbar">
        <div className="brand">
          OT <span>Hub</span>
        </div>
      </div>
      <section className="panel">
        <h1>Welcome back</h1>
        <p className="muted">Sign in to see your schedule.</p>
        <ErrorMessage>{error}</ErrorMessage>
        <Formik
          initialValues={{ email: '', password: '' }}
          validationSchema={Yup.object({
            email: Yup.string().email('Enter a valid email.').required('Email is required.'),
            password: Yup.string().required('Password is required.'),
          })}
          onSubmit={async (values, helpers) => {
            setError('');
            try {
              await signIn(values.email, values.password);
            } catch (requestError) {
              setError(getApiErrorMessage(requestError));
            } finally {
              helpers.setSubmitting(false);
            }
          }}
        >
          {({ errors, touched, isSubmitting }) => (
            <Form className="stack" style={{ marginTop: 22 }}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <Field id="email" name="email" type="email" autoComplete="username" />
                {touched.email && errors.email && <small className="error">{errors.email}</small>}
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <Field
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                />
                {touched.password && errors.password && (
                  <small className="error">{errors.password}</small>
                )}
              </div>
              <button className="btn" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </button>
            </Form>
          )}
        </Formik>
      </section>
    </main>
  );
}

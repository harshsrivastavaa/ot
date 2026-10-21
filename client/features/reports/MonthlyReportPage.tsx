'use client';

import { FormEvent, useEffect, useState } from 'react';
import { RequireRole } from '@/components/auth/RequireRole';
import { EmptyMessage, ErrorMessage, LoadingMessage, PageHeading } from '@/components/ui/Feedback';
import { getApiErrorMessage } from '@/lib/api';
import { downloadMonthlyReport, getMonthlyReport } from '@/services/reportsService';
import type { MonthlyReportRow, UserRole } from '@/types/api';

function currentMonthInIndia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
  })
    .format(new Date())
    .slice(0, 7);
}

export function MonthlyReportPage({ role }: { role: Extract<UserRole, 'Manager' | 'Admin'> }) {
  const [month, setMonth] = useState(currentMonthInIndia);
  const [rows, setRows] = useState<MonthlyReportRow[]>([]);
  const [summary, setSummary] = useState({ employees: 0, hours: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function load(event?: FormEvent) {
    event?.preventDefault();
    if (!month) return;
    setLoading(true);
    setError('');
    try {
      const result = await getMonthlyReport(month);
      setRows(result.data);
      setSummary(result.summary);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  async function exportCsv() {
    setError('');
    try {
      const file = await downloadMonthlyReport(month);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ot-report-${month}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <RequireRole roles={[role]}>
      <PageHeading
        title="Monthly overtime report"
        description="Review approved hours by employee for a calendar month."
      />
      <ErrorMessage>{error}</ErrorMessage>
      <section className="panel stack">
        <form className="row" onSubmit={(event) => void load(event)}>
          <div className="field">
            <label htmlFor="report-month">Month</label>
            <input
              id="report-month"
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
            />
          </div>
          <button className="btn" disabled={loading}>
            {loading ? 'Loading…' : 'View report'}
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() => void exportCsv()}
            disabled={!month}
          >
            Download CSV
          </button>
        </form>
        <div className="grid">
          <div className="panel">
            <div className="muted">Employees</div>
            <strong>{summary.employees}</strong>
          </div>
          <div className="panel">
            <div className="muted">Approved hours</div>
            <strong>{summary.hours.toFixed(2)}</strong>
          </div>
        </div>
        {loading ? (
          <LoadingMessage>Loading report…</LoadingMessage>
        ) : rows.length === 0 ? (
          <EmptyMessage>No approved overtime was found for this month.</EmptyMessage>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Approved hours</th>
                  <th>Shifts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.employeeId}>
                    <td>{row.name}</td>
                    <td>{row.email}</td>
                    <td>{row.department}</td>
                    <td>{row.hours.toFixed(2)}</td>
                    <td>{row.shifts}</td>
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

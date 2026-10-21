import api from '@/lib/api';
import type { MonthlyReportRow } from '@/types/api';

export async function getMonthlyReport(month: string) {
  const { data } = await api.get<{
    data: MonthlyReportRow[];
    summary: { employees: number; hours: number };
  }>('/reports/monthly', { params: { month } });
  return data;
}

export async function downloadMonthlyReport(month: string) {
  const { data } = await api.get<Blob>('/reports/monthly', {
    params: { month, format: 'csv' },
    responseType: 'blob',
  });
  return data;
}

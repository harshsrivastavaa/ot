import api from '@/lib/api';
import type { ApiList, AuditEntry } from '@/types/api';

export async function listAuditEntries(params: Record<string, string | number | undefined> = {}) {
  const { data } = await api.get<ApiList<AuditEntry>>('/audit-logs', { params });
  return data;
}

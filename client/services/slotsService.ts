import api from '@/lib/api';
import type { ApiList, Signup, Slot } from '@/types/api';

export type SlotInput = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  requiredHeadcount: number;
  department?: string;
};

export async function listSlots(params: Record<string, string | number | undefined> = {}) {
  const { data } = await api.get<ApiList<Slot>>('/slots', { params });
  return data;
}

export async function createSlot(input: SlotInput) {
  const { data } = await api.post<{ data: Slot }>('/slots', input);
  return data.data;
}

export async function updateSlot(slotId: string, input: Partial<SlotInput>) {
  const { data } = await api.patch<{ data: Slot }>(`/slots/${slotId}`, input);
  return data.data;
}

export async function cancelSlot(slotId: string) {
  const { data } = await api.post<{ data: Slot }>(`/slots/${slotId}/cancel`);
  return data.data;
}

export async function markAvailable(slotId: string) {
  const { data } = await api.post<{ data: Signup }>(`/slots/${slotId}/signups`);
  return data.data;
}

export async function listSlotSignups(
  slotId: string,
  params: Record<string, string | number | undefined> = {},
) {
  const { data } = await api.get<ApiList<Signup>>(`/slots/${slotId}/signups`, { params });
  return data;
}

export async function decideSignup(signupId: string, decision: 'approved' | 'rejected') {
  const { data } = await api.patch<{ data: Signup }>(`/signups/${signupId}/decision`, { decision });
  return data.data;
}

export async function listMySignups(params: Record<string, string | number | undefined> = {}) {
  const { data } = await api.get<
    ApiList<Signup> & { summary: { weeklyHours: number; weeklyCap: number } }
  >('/me/signups', { params });
  return data;
}

export async function withdrawSignup(signupId: string) {
  const { data } = await api.delete<{ data: Signup }>(`/signups/${signupId}`);
  return data.data;
}

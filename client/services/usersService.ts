import api from '@/lib/api';
import type { ApiList, User, UserRole } from '@/types/api';

export type CreateUserInput = {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
  weeklyCap: number;
};

export async function listUsers(params: Record<string, string | number | undefined> = {}) {
  const { data } = await api.get<ApiList<User>>('/users', { params });
  return data;
}

export async function createUser(input: CreateUserInput) {
  const { data } = await api.post<{ data: User }>('/users', input);
  return data.data;
}

export async function changeWeeklyCap(userId: string, weeklyCap: number) {
  const { data } = await api.patch<{ data: User }>(`/users/${userId}/ot-cap`, { weeklyCap });
  return data.data;
}

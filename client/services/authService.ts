import api from '@/lib/api';
import type { User } from '@/types/api';

type LoginResponse = { data: { token: string; user: User } };
type UserResponse = { data: User };

export async function login(email: string, password: string) {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data.data;
}

export async function getCurrentUser() {
  const { data } = await api.get<UserResponse>('/auth/me');
  return data.data;
}

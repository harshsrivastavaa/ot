import axios, { AxiosError } from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('ot-hub-token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const sentWithToken = Boolean(error.config?.headers?.Authorization);
    if (error.response?.status === 401 && sentWithToken && typeof window !== 'undefined') {
      window.localStorage.removeItem('ot-hub-token');
      window.dispatchEvent(new Event('ot-hub:session-expired'));
    }
    return Promise.reject(error);
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.data?.error?.message) return error.response.data.error.message;
    if (error.code === 'ECONNABORTED') return 'The server took too long to respond. Try again.';
    if (!error.response) return 'Could not reach the server. Check your connection and try again.';
  }
  return 'Something went wrong. Try again.';
}

export default api;

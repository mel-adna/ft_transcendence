import axios from 'axios';

const TOKEN_KEY = 'token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(value) {
  localStorage.setItem(TOKEN_KEY, value);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

const api = axios.create({
  baseURL: import.meta.env.VITE_CORE_API_URL ?? 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname !== '/login') {
      clearToken();
      window.location.replace('/login');
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error) {
  const data = error?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors)[0];
    if (first) return String(first);
  }
  if (error?.message === 'Network Error') {
    return 'Cannot reach the server. Check that the backend is running.';
  }
  return 'Something went wrong. Please try again.';
}

export default api;

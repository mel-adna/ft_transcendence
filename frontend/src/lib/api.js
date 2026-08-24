import axios from 'axios';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

const baseURL = import.meta.env.VITE_CORE_API_URL ?? 'http://localhost:8080/api/v1';

const AUTH_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh'];

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(value) {
  localStorage.setItem(TOKEN_KEY, value);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(value) {
  if (value) localStorage.setItem(REFRESH_TOKEN_KEY, value);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function isAuthPath(url) {
  return AUTH_PATHS.some((path) => String(url ?? '').includes(path));
}

export function shouldRefresh({ status, url, hasRetried, hasRefreshToken }) {
  if (status !== 401) return false;
  if (hasRetried) return false;
  if (isAuthPath(url)) return false;
  return Boolean(hasRefreshToken);
}

function goToLogin() {
  clearToken();
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    const refreshToken = getRefreshToken();
    refreshPromise = axios
      .post(`${baseURL}/auth/refresh`, { refreshToken })
      .then((response) => {
        setToken(response.data.accessToken);
        setRefreshToken(response.data.refreshToken);
        return response.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (status !== 401 || !original) return Promise.reject(error);

    if (!shouldRefresh({
      status,
      url: original.url,
      hasRetried: original.hasRetried,
      hasRefreshToken: Boolean(getRefreshToken()),
    })) {
      if (!isAuthPath(original.url) && !original.hasRetried) goToLogin();
      return Promise.reject(error);
    }

    original.hasRetried = true;

    try {
      const token = await refreshAccessToken();
      original.headers = { ...original.headers, Authorization: `Bearer ${token}` };
      return api(original);
    } catch {
      goToLogin();
      return Promise.reject(error);
    }
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

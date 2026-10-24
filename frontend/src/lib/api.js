import axios from 'axios';
import { socketClient } from '../infrastructure/socket/SocketClient';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const RENEW_BEFORE_EXPIRY_MS = 60 * 1000;
const RENEW_SPREAD_MS = 30 * 1000;
const RENEW_RETRY_MS = 15 * 1000;

let renewTimer = null;

const baseURL = import.meta.env.VITE_CORE_API_URL ?? 'http://localhost:8080/api/v1';

export const CHAT_API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5005/api';

const AUTH_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/verify-email',
  '/auth/google',
  '/auth/refresh',
  '/auth/logout',
];

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(value) {
  localStorage.setItem(TOKEN_KEY, value);
  scheduleRenewal();
}

function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(value) {
  if (value) localStorage.setItem(REFRESH_TOKEN_KEY, value);
  scheduleRenewal();
}

export function clearToken() {
  clearTimeout(renewTimer);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function tokenExpiry(token) {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function expiresSoon(token) {
  const expiry = token ? tokenExpiry(token) : null;
  return expiry !== null && expiry - Date.now() < RENEW_BEFORE_EXPIRY_MS;
}

function scheduleRenewal() {
  clearTimeout(renewTimer);
  const token = getToken();
  if (!token) return;
  const expiry = tokenExpiry(token);
  if (expiry === null || !getRefreshToken()) return;
  const delay = expiry - Date.now() - RENEW_BEFORE_EXPIRY_MS - Math.random() * RENEW_SPREAD_MS;
  renewTimer = setTimeout(() => renew(token), Math.max(delay, 0));
}

function canRetryRenewal(error) {
  const status = error?.response?.status;
  return !status || status === 429 || status >= 500;
}

function renew(token) {
  if (getToken() !== token) {
    scheduleRenewal();
    return;
  }
  refreshAccessToken().catch((error) => {
    if (getToken() !== token || !canRetryRenewal(error)) return;
    renewTimer = setTimeout(() => renew(token), RENEW_RETRY_MS + Math.random() * RENEW_RETRY_MS);
  });
}

export function postWithoutSession(path, body) {
  return axios.post(`${baseURL}${path}`, body, {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function revokeRefreshToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;
  try {
    await axios.post(`${baseURL}/auth/logout`, { refreshToken });
  } catch {
    return;
  }
}

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  if (!isAuthPath(config.url) && getRefreshToken() && expiresSoon(getToken())) {
    await refreshAccessToken().catch(() => {});
  }
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function isAuthPath(url) {
  return AUTH_PATHS.some((path) => String(url ?? '').includes(path));
}

function isSessionExpired({ status, message }) {
  if (status === 401) return true;
  return status === 403 && message === 'Forbidden';
}

export function isEmailNotVerified(error) {
  const response = error?.response;
  if (response?.status !== 403) return false;
  if (response.data?.errors?.errorCode === 'EMAIL_NOT_VERIFIED') return true;
  return /not verified|account is disabled/i.test(String(response.data?.message ?? ''));
}

function shouldRefresh({ status, message, url, hasRetried, hasRefreshToken }) {
  if (!isSessionExpired({ status, message })) return false;
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
        socketClient.updateToken(response.data.accessToken);
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
    const message = error.response?.data?.message;

    if (!original || !isSessionExpired({ status, message })) return Promise.reject(error);

    if (!shouldRefresh({
      status,
      message,
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

function waitLabel(seconds) {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? '' : 's'}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

export function getErrorMessage(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  if (status === 429) {
    const seconds = Number(data?.errors?.retryAfterSeconds);
    if (Number.isFinite(seconds) && seconds > 0) {
      return `Too many attempts. Try again in ${waitLabel(seconds)}.`;
    }
    return 'Too many attempts. Please wait a moment and try again.';
  }

  const text = typeof data === 'string' ? data.trim() : '';
  if (text && !text.startsWith('<')) return text;
  if (data?.message) return data.message;
  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors)[0];
    if (first) return String(first);
  }
  if (error?.message === 'Network Error' || [502, 503, 504].includes(status)) {
    return 'Cannot reach the server. Check that the backend is running.';
  }
  return 'Something went wrong. Please try again.';
}

scheduleRenewal();

export default api;

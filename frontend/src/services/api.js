/**
 * api.js — Centralized Axios HTTP Service Instance.
 * Configured with baseURL from VITE_API_BASE_URL (or default http://127.0.0.1:8787),
 * automatic JWT bearer authorization header injection, and global 401 interceptor.
 */

// Dynamic Base URL: Production Cloudflare Workers API online vs Local Worker (8787)
const isProduction =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

const API_BASE_URL = isProduction
  ? (import.meta.env.VITE_PROD_API_BASE_URL || 'https://ai-health-checker-api.aryan-shanu-mobile.workers.dev')
  : (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: Attach JWT Bearer Token ─────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Handle Authentication Errors ───────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export default api;

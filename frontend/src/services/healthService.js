/**
 * healthService.js
 * Calls the backend /api/health endpoint.
 * Used on startup to verify frontend ↔ backend connectivity.
 */

import api from './api';

export const checkHealth = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

export const ping = async () => {
  const response = await api.get('/api/ping');
  return response.data;
};

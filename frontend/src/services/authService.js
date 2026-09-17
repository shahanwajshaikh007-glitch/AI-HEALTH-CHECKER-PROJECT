/**
 * authService.js
 * Centralized API service for registration, login, profile management, and logout.
 */

import api from './api';

export const authService = {
  async register(data) {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },

  async login(email, password) {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/api/profile');
    return response.data;
  },

  async updateProfile(data) {
    const response = await api.put('/api/profile', data);
    return response.data;
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }
};

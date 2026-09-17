/**
 * adminService.js
 * Centralized API service for Admin Dashboard statistics and monitoring.
 */

import api from './api';

export const adminService = {
  async getStatistics() {
    const response = await api.get('/api/admin/statistics');
    return response.data;
  },

  async getUsers() {
    const response = await api.get('/api/admin/users');
    return response.data;
  },

  async getSymptoms() {
    const response = await api.get('/api/admin/symptoms');
    return response.data;
  },

  async getDiseases() {
    const response = await api.get('/api/admin/diseases');
    return response.data;
  },

  async getModelPerformance() {
    const response = await api.get('/api/admin/model-performance');
    return response.data;
  }
};

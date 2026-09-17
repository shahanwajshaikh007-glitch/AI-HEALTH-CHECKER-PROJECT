/**
 * predictionService.js
 * Centralized API service for ML disease prediction and assessment history.
 */

import api from './api';

export const predictionService = {
  async predictDisease(payload) {
    const response = await api.post('/api/prediction', payload);
    return response.data;
  },

  async getHistory() {
    const response = await api.get('/api/prediction/history');
    return response.data;
  },

  async deleteAssessment(id) {
    const response = await api.delete(`/api/prediction/history/${id}`);
    return response.data;
  }
};

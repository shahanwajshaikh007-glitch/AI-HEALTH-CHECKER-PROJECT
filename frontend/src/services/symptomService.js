/**
 * symptomService.js
 * Centralized API service for NLP symptom extraction and fetching symptom lists.
 */

import api from './api';

export const symptomService = {
  async analyzeSymptoms(text, language = 'en') {
    const response = await api.post('/api/symptoms/analyze', { text, language });
    return response.data;
  },

  async getSymptoms() {
    const response = await api.get('/api/symptoms');
    return response.data;
  }
};

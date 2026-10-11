/**
 * reportService.js
 * Centralized API service for PDF report generation and download.
 */

import api from './api';

export const reportService = {
  async generateReport(assessmentId) {
    const response = await api.post('/api/reports', { assessment_id: assessmentId });
    return response.data;
  },

  getReportDownloadUrl(reportId) {
    const isProduction =
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    const baseUrl = isProduction
      ? (import.meta.env.VITE_PROD_API_BASE_URL || 'https://ai-health-checker-api.aryan-shanu-mobile.workers.dev')
      : (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8787');

    return `${baseUrl}/api/reports/${reportId}/pdf`;
  }
};

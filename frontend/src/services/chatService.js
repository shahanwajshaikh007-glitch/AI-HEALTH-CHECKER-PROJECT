/**
 * chatService.js
 * Centralized API service for AI Medical Assistant messaging.
 */

import api from './api';

export const chatService = {
  async sendMessage(message, assessmentContext = null) {
    const response = await api.post('/api/chat', {
      message,
      assessment_context: assessmentContext
    });
    return response.data;
  },

  async getChatHistory() {
    const response = await api.get('/api/chat/history');
    return response.data;
  },

  async clearChatHistory() {
    const response = await api.delete('/api/chat/history');
    return response.data;
  }
};

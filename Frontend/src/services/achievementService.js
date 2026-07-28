import { api } from './api.js';

export const achievementService = {
  list: () => api.get('/achievements'),
  check: () => api.post('/achievements/check'),
  generateAnalyticsNotifications: () => api.post('/notifications/generate-analytics'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
};

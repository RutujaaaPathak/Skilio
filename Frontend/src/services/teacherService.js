import { api } from './api.js';

export const teacherService = {
  getDashboard: () => api.get('/teacher/dashboard'),
  getPendingEvaluations: () => api.get('/teacher/evaluations/pending'),
  getPerformance: () => api.get('/teacher/performance'),
  getActivities: () => api.get('/teacher/activities'),
  getRecentAlerts: () => api.get('/teacher/alerts/recent'),
  getAnnouncements: () => api.get('/announcements'),
  getTrends: () => api.get('/teacher/trends'),
  getAnalytics: (params) => api.get(`/teacher/analytics${params ? `?${params}` : ''}`),
};

import { api } from './api.js';

export const monitoringService = {
  logEvent: (payload) => api.post('/proctor/events', payload),
};

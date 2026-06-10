import { api } from './api.js';

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAnalytics: (range) => api.get(`/admin/analytics?range=${range}`),
  getBatches: () => api.get('/admin/batches'),
  createBatch: (data) => api.post('/admin/batches', data),
  getDepartments: () => api.get('/admin/departments'),
  getInstitutions: () => api.get('/admin/institutions'),
  getStudents: () => api.get('/admin/students'),
  getSubscriptions: () => api.get('/admin/subscriptions'),
  getTeachers: () => api.get('/admin/teachers'),
  getPolicies: () => api.get('/admin/policies'),
  updatePolicy: (id, data) => api.patch(`/admin/policies/${id}`, data),
};

import { api } from './api.js';

export const adminService = {
  getDashboard: () => api.get('/admin/dashboard'),
  getAnalytics: (range) => api.get(`/admin/analytics?range=${range}`),
  getBatches: () => api.get('/admin/batches'),
  createBatch: (data) => api.post('/admin/batches', data),
  getDepartments: () => api.get('/departments'),
  createDepartment: (data) => api.post('/departments', data),
  updateDepartment: (id, data) => api.put(`/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/departments/${id}`),
  getInstitutions: () => api.get('/institutions'),
  createInstitution: (data) => api.post('/institutions', data),
  updateInstitution: (id, data) => api.put(`/institutions/${id}`, data),
  deleteInstitution: (id) => api.delete(`/institutions/${id}`),
  getStudents: () => api.get('/admin/students'),
  getSubscriptions: () => api.get('/admin/subscriptions'),
  getTeachers: () => api.get('/admin/teachers'),
  getPolicies: () => api.get('/admin/policies'),
  updatePolicy: (id, data) => api.patch(`/admin/policies/${id}`, data),
};

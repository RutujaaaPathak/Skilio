import { api } from './api.js';

export const syllabusService = {
  list: (subject) => {
    const params = subject ? `?subject=${encodeURIComponent(subject)}` : '';
    return api.get(`/syllabus${params}`);
  },
  listSubjects: () => api.get('/syllabus/subjects'),
  getById: (id) => api.get(`/syllabus/${id}`),
  create: (data) => api.post('/syllabus', data),
  bulkCreate: (entries) => api.post('/syllabus/bulk', entries),
  update: (id, data) => api.put(`/syllabus/${id}`, data),
  toggleComplete: (id) => api.patch(`/syllabus/${id}/toggle-complete`),
  delete: (id) => api.delete(`/syllabus/${id}`),
};
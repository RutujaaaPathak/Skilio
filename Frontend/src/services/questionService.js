import { api } from './api.js';

export const questionService = {
  list: (params) => {
    const query = new URLSearchParams();
    if (params?.subject) query.set('subject', params.subject);
    if (params?.topic) query.set('topic', params.topic);
    if (params?.difficulty) query.set('difficulty', params.difficulty);
    if (params?.question_type) query.set('question_type', params.question_type);
    const qs = query.toString();
    return api.get(`/questions${qs ? '?' + qs : ''}`);
  },
  getById: (id) => api.get(`/questions/${id}`),
  create: (data) => api.post('/questions', data),
  update: (id, data) => api.put(`/questions/${id}`, data),
  delete: (id) => api.delete(`/questions/${id}`),
  bulkCreate: (questions) => api.post('/questions/bulk', { questions }),
  generate: (params) => api.post('/questions/generate', params),
};

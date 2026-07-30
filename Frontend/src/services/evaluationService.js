import { api } from './api.js';

export const evaluationService = {
  getDashboard: (examId) => api.get(`/teacher/exams/${examId}/evaluation/dashboard`),

  getQueue: (examId, params = {}) => {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', params.page);
    if (params.per_page) qs.set('per_page', params.per_page);
    if (params.search) qs.set('search', params.search);
    if (params.status && params.status !== 'all') qs.set('status', params.status);
    if (params.sort_by) qs.set('sort_by', params.sort_by);
    if (params.sort_dir) qs.set('sort_dir', params.sort_dir);
    const query = qs.toString();
    return api.get(`/teacher/exams/${examId}/evaluation/queue${query ? `?${query}` : ''}`);
  },

  getStudentSubmission: (examId, studentId) =>
    api.get(`/teacher/exams/${examId}/evaluation/submission/${studentId}`),

  saveEvaluation: (examId, data) =>
    api.put(`/teacher/exams/${examId}/evaluation/save`, data),

  requestAISuggestion: (examId, studentId, questionId) =>
    api.post(`/teacher/exams/${examId}/evaluation/ai-suggest`, { student_id: studentId, question_id: questionId }),

  getFinalReview: (examId) =>
    api.get(`/teacher/exams/${examId}/evaluation/review`),

  getFullReport: (examId) =>
    api.get(`/teacher/exams/${examId}/evaluation/report`),

  publishResults: (examId, confirm = true) =>
    api.post(`/teacher/exams/${examId}/evaluation/publish`, { confirm }),
};

import { api } from './api.js';

export const examService = {
  list: () => api.get('/exams'),
  getById: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
  addQuestions: (examId, data) => api.post(`/exams/${examId}/questions`, data),
  getQuestions: (examId) => api.get(`/exams/${examId}/questions`),
  assignStudents: (examId, studentIds) => api.post(`/exams/${examId}/assign`, { student_ids: studentIds }),
  getAssignedStudents: (examId) => api.get(`/exams/${examId}/assigned-students`),
  getMyExams: () => api.get('/students/my-exams'),
  removeAssignment: (assignmentId) => api.delete(`/exams/assignments/${assignmentId}`),
};

import { api } from './api.js';

export const classService = {
  getMyClasses: () => api.get('/classes/student/classes'),

  getMyClassDetail: (classId) => api.get(`/classes/student/${classId}`),

  getMyClassExams: (classId) => api.get(`/classes/student/${classId}/exams`),

  joinClass: (code) => api.post('/classes/join', { code }),

  getTeacherClasses: () => api.get('/classes'),

  createClass: (data) => api.post('/classes', data),

  getClassDetail: (classId) => api.get(`/classes/${classId}`),

  updateClass: (classId, data) => api.put(`/classes/${classId}`, data),

  getClassMembers: (classId) => api.get(`/classes/${classId}/members`),

  removeStudent: (classId, studentId) => api.delete(`/classes/${classId}/members/${studentId}`),

  regenerateCode: (classId) => api.post(`/classes/${classId}/regenerate-code`),

  assignExamToClass: (classId, examId, assignToFutureMembers = false) =>
    api.post(`/classes/${classId}/assign-exam?exam_id=${examId}&assign_to_future_members=${assignToFutureMembers}`),

  assignExamToClasses: (examId, classIds, assignToFutureMembers = false) =>
    api.post(`/classes/assign-exam?exam_id=${examId}`, { class_ids: classIds, assign_to_future_members: assignToFutureMembers }),

  getClassExams: (classId) => api.get(`/classes/${classId}/exams`),

  getExamClasses: (examId) => api.get(`/classes/exam/${examId}/classes`),
};

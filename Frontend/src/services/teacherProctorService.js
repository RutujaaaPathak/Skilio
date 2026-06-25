import { api } from './api.js';

export const teacherProctorService = {
  getExamRiskReports: (examId) => api.get(`/teacher/exams/${examId}/risk-reports`),
  getStudentRiskReport: (examId, studentId) => api.get(`/teacher/exams/${examId}/students/${studentId}/risk-report`),
  getExamProctorEvents: (examId) => api.get(`/teacher/exams/${examId}/proctor-events`),
  getStudentProctorEvents: (examId, studentId) => api.get(`/teacher/exams/${examId}/students/${studentId}/proctor-events`),
};

import { api } from './api.js';

export const examService = {
  list: () => api.get('/exams'),
  getById: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.put(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
  cancel: (id, reason) => api.post(`/exams/${id}/cancel`, { reason }),
  reschedule: (id, data) => api.post(`/exams/${id}/reschedule`, data),
  checkConflicts: (startTime, endTime, excludeExamId) => {
    let url = `/exams/conflicts/check?start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`
    if (excludeExamId) url += `&exclude_exam_id=${excludeExamId}`
    return api.get(url)
  },
  addQuestions: (examId, data) => api.post(`/exams/${examId}/questions`, data),
  getQuestions: (examId) => api.get(`/exams/${examId}/questions`),
  assignStudents: (examId, studentIds) => api.post(`/exams/${examId}/assign`, { student_ids: studentIds }),
  getAssignedStudents: (examId) => api.get(`/exams/${examId}/assigned-students`),
  getMyExams: () => api.get('/students/my-exams'),
  getMyResults: () => api.get('/students/my-results'),
  getPracticeRecommendations: () => api.get('/students/practice-recommendations'),
  getAiInsights: () => api.get('/students/ai-insights'),
  getCoreAnalytics: () => api.get('/students/analytics/core'),
  getWeeklyProgress: () => api.get('/students/analytics/weekly-progress'),
  getLearningStreak: () => api.get('/students/analytics/learning-streak'),
  getTopicMastery: () => api.get('/students/analytics/topic-mastery'),
  getRanking: () => api.get('/students/analytics/ranking'),
  getIntegrityBreakdown: () => api.get('/students/analytics/integrity'),
  removeAssignment: (assignmentId) => api.delete(`/exams/assignments/${assignmentId}`),
};

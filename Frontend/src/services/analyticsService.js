import { api } from './api.js';

export const analyticsService = {
  getMyResults: (examIds) => {
    if (!examIds.length) return Promise.resolve([]);
    return Promise.allSettled(
      examIds.map((id) => api.get(`/students/exams/${id}/my-submission`))
    ).then((results) =>
      results
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value)
    );
  },
};

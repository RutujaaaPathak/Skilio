import { api } from './api.js';

export const studentService = {
  list: (params = {}) => {
    const qs = new URLSearchParams();
    if (params.batch) qs.set('batch', params.batch);
    if (params.year) qs.set('year', params.year);
    if (params.branch) qs.set('branch', params.branch);
    if (params.division) qs.set('division', params.division);
    const query = qs.toString();
    return api.get(`/students${query ? '?' + query : ''}`);
  },
};

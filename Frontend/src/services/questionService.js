import { api } from './api.js';

function buildExportQuery(params = {}) {
  const query = new URLSearchParams();
  if (params.subject) query.set('subject', params.subject);
  if (params.topic) query.set('topic', params.topic);
  if (params.difficulty) query.set('difficulty', params.difficulty);
  if (params.question_type) query.set('question_type', params.question_type);
  if (params.search) query.set('search', params.search);
  return query.toString();
}

async function downloadExport(endpoint, filename) {
  const mod = await import('./api.js');
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const res = await fetch(BASE_URL + endpoint, {
    headers: mod.getAccessToken() ? { Authorization: 'Bearer ' + mod.getAccessToken() } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Export failed');
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const questionService = {
  list: (params = {}) => {
    const query = new URLSearchParams();
    if (params.subject) query.set('subject', params.subject);
    if (params.topic) query.set('topic', params.topic);
    if (params.difficulty) query.set('difficulty', params.difficulty);
    if (params.question_type) query.set('question_type', params.question_type);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.page_size) query.set('page_size', String(params.page_size));
    const qs = query.toString();
    return api.get('/questions' + (qs ? '?' + qs : ''));
  },
  getById: (id) => api.get('/questions/' + id),
  create: (data) => api.post('/questions', data),
  update: (id, data) => api.put('/questions/' + id, data),
  delete: (id) => api.delete('/questions/' + id),
  bulkCreate: (questions) => api.post('/questions/bulk', { questions }),
  generate: (params) => api.post('/questions/generate', params),

  duplicate: (id) => api.post('/questions/' + id + '/duplicate'),
  bulkDelete: (questionIds) => api.post('/questions/bulk-delete', { question_ids: questionIds }),

  exportCsv: async (params = {}) => {
    const qs = buildExportQuery(params);
    await downloadExport('/questions/export/csv' + (qs ? '?' + qs : ''), 'questions.csv');
  },
  exportJson: async (params = {}) => {
    const qs = buildExportQuery(params);
    await downloadExport('/questions/export/json' + (qs ? '?' + qs : ''), 'questions.json');
  },
  exportPdf: async (params = {}) => {
    const qs = buildExportQuery(params);
    await downloadExport('/questions/export/pdf' + (qs ? '?' + qs : ''), 'questions.pdf');
  },
  importExcelPreview: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/questions/import/excel', formData);
  },

  importPdfPreview: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/questions/import/pdf', formData);
  },

  suggest: (id) => api.post('/questions/' + id + '/suggest'),
  analytics: () => api.get('/questions/analytics'),
  bulkUpdate: (questionIds, data) => api.post('/questions/bulk-update', { question_ids: questionIds, ...data }),
  bulkDuplicate: (questionIds) => api.post('/questions/bulk-duplicate', { question_ids: questionIds }),
  getVersions: (id) => api.get('/questions/' + id + '/versions'),
  generateEquivalent: (questionId, count = 1) => api.post('/questions/generate-equivalent', { question_id: questionId, count }),
  generateEquivalentFromData: (data, count = 1) => api.post('/questions/generate-equivalent', { ...data, count }),
  checkDuplicates: (questionTexts) => api.post('/questions/check-duplicates', { question_texts: questionTexts }),
};
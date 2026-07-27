import { api } from './api.js';

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  signup: (data) => api.post('/auth/signup', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  verifyEmail: (otp) => api.post('/auth/verify-email', { otp }),
  resendVerification: (email) => api.post('/auth/resend-verification', { email }),
  getLoginHistory: () => api.get('/auth/login-history'),
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
  revokeAllSessions: () => api.delete('/auth/sessions'),
  setupTotp: () => api.post('/auth/totp/setup'),
  enableTotp: (code) => api.post('/auth/totp/enable', { code }),
  disableTotp: (password) => api.post('/auth/totp/disable', { password }),
  verifyTotpLogin: (tempToken, code) => api.post('/auth/totp/verify', { temp_token: tempToken, code }),
  getTotpStatus: () => api.get('/auth/totp/status'),
  getProfileCompletion: () => api.get('/auth/me/completion'),
  updateProfile: (data) => api.put('/auth/me', data),
  getInstitutions: () => api.get('/institutions'),
  getDepartments: (institutionId) => api.get(`/departments${institutionId ? `?institution_id=${institutionId}` : ''}`),
  getEmergencyContacts: () => api.get('/auth/me/emergency-contacts'),
  createEmergencyContact: (data) => api.post('/auth/me/emergency-contacts', data),
  updateEmergencyContact: (id, data) => api.put(`/auth/me/emergency-contacts/${id}`, data),
  deleteEmergencyContact: (id) => api.delete(`/auth/me/emergency-contacts/${id}`),
  uploadPhoto: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/profile/photo', formData);
  },
  removePhoto: () => api.delete('/profile/photo'),
  oauthLogin: (provider, idToken, role = 'student') => api.post('/auth/oauth', { provider, id_token: idToken, role }),
  deleteAccount: (password) => api.delete('/auth/me', { body: JSON.stringify({ password }) }),
  exportData: () => api.get('/auth/me/export'),
  adminListUsers: (params) => api.get('/admin/users', { params: new URLSearchParams(params || {}) }),
  adminUpdateUser: (userId, data) => api.patch(`/admin/users/${userId}`, data),
  adminBulkInvite: (file, role = 'student') => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/bulk-invite', formData);
  },
  webauthnRegisterBegin: () => api.post('/auth/webauthn/register/begin'),
  webauthnRegisterComplete: (credential, challenge) => api.post('/auth/webauthn/register/complete', { credential, challenge }),
  webauthnAuthenticateBegin: () => api.post('/auth/webauthn/authenticate/begin'),
  webauthnAuthenticateComplete: (credential, challenge) => api.post('/auth/webauthn/authenticate/complete', { credential, challenge }),
  webauthnListCredentials: () => api.get('/auth/webauthn/credentials'),
  webauthnDeleteCredential: (id) => api.delete(`/auth/webauthn/credentials/${id}`),
};
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
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
  revokeAllSessions: () => api.delete('/auth/sessions'),
  setupTotp: () => api.post('/auth/totp/setup'),
  enableTotp: (code) => api.post('/auth/totp/enable', { code }),
  disableTotp: (password) => api.post('/auth/totp/disable', { password }),
  verifyTotpLogin: (tempToken, code) => api.post('/auth/totp/verify', { temp_token: tempToken, code }),
  getTotpStatus: () => api.get('/auth/totp/status'),
  updateProfile: (data) => api.put('/auth/me', data),
  uploadPhoto: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/profile/photo', formData);
  },
  removePhoto: () => api.delete('/profile/photo'),
};
import { api } from './api.js';

export const securityService = {
  verifyFingerprint(fingerprintHash) {
    return api.post('/security/verify-fingerprint', { fingerprint_hash: fingerprintHash });
  },

  submitReport(report) {
    return api.post('/security/report', report);
  },

  healthCheck() {
    return api.get('/health');
  },
};

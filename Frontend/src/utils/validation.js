export const PASSWORD_RULES = [
  { key: 'min', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'digit', label: 'One digit', test: (v) => /\d/.test(v) },
  { key: 'special', label: 'One special character', test: (v) => /[!@#$%^&*(),.?":{}|<>_\-]/.test(v) },
];

export function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 15;
  if (/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) score += 20;
  if (score >= 90) return { score, label: 'Very Strong', color: 'bg-emerald-500' };
  if (score >= 70) return { score, label: 'Strong', color: 'bg-green-500' };
  if (score >= 50) return { score, label: 'Fair', color: 'bg-yellow-500' };
  if (score >= 30) return { score, label: 'Weak', color: 'bg-orange-500' };
  return { score, label: 'Very Weak', color: 'bg-red-500' };
}

export function getPasswordErrors(pw) {
  return PASSWORD_RULES.filter((r) => !r.test(pw)).map((r) => r.label);
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone) {
  return !phone || /^\+?[\d\s\-()]{7,20}$/.test(phone);
}

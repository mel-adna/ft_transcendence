export function validatePassword(value) {
  if (!value || value.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[a-z]/.test(value)) return 'Password needs one lowercase letter.';
  if (!/[A-Z]/.test(value)) return 'Password needs one uppercase letter.';
  if (!/\d/.test(value)) return 'Password needs one number.';
  if (!/[@$!%*?&#]/.test(value)) {
    return 'Password needs one special character (@$!%*?&#).';
  }
  return null;
}

export function validateEmail(value) {
  if (!value) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
  return null;
}

export function validateRequired(value, label) {
  if (!value || !value.trim()) return `${label} is required.`;
  return null;
}

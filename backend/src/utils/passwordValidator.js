/**
 * Password Validation Utilities
 */

/**
 * Validate password strength and complexity
 * @param {string} password - Password to validate
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*, etc)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    score: calculatePasswordScore(password),
  };
};

/**
 * Calculate password strength score (0-5)
 * @param {string} password - Password to evaluate
 * @returns {number} Score from 0-5
 */
export const calculatePasswordScore = (password) => {
  if (!password) return 0;

  let score = 0;

  // Length score
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  return Math.min(score, 5);
};

/**
 * Get password strength label
 * @param {number} score - Password score (0-5)
 * @returns {string} Strength label
 */
export const getPasswordStrengthLabel = (score) => {
  const labels = {
    0: 'Very Weak',
    1: 'Weak',
    2: 'Fair',
    3: 'Good',
    4: 'Strong',
    5: 'Very Strong',
  };
  return labels[Math.floor(score)] || 'Unknown';
};

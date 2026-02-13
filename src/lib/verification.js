import crypto from 'crypto';

/**
 * Generate a secure verification token
 * @returns {string} A secure random token
 */
export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate token expiry timestamp (24 hours from now)
 * @returns {Date} Expiry date
 */
export function generateTokenExpiry() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
}

/**
 * Check if a token has expired
 * @param {Date} expiryDate - Token expiry date
 * @returns {boolean} Whether the token has expired
 */
export function isTokenExpired(expiryDate) {
  return new Date() > new Date(expiryDate);
}

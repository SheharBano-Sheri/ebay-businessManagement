/**
 * Validates password strength
 * Requires:
 * - At least 8 characters
 * - At least one special character
 * - At least one number (recommended)
 * - At least one uppercase letter (recommended)
 */
export function validatePassword(password) {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  // Check for special characters
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
  if (!specialCharRegex.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?\\)');
  }
  
  // Check for numbers (recommended)
  const numberRegex = /[0-9]/;
  if (!numberRegex.test(password)) {
    errors.push('Password should contain at least one number');
  }
  
  // Check for uppercase letters (recommended)
  const uppercaseRegex = /[A-Z]/;
  if (!uppercaseRegex.test(password)) {
    errors.push('Password should contain at least one uppercase letter');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Checks if password meets minimum requirements (length + special character)
 */
export function isPasswordValid(password) {
  if (!password || password.length < 8) {
    return false;
  }
  
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
  return specialCharRegex.test(password);
}

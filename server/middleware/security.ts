import type { Request, Response, NextFunction } from 'express';

// 🔧 DEVELOPMENT MODE: Rate limiting DISABLED
// Re-enable for production by uncommenting rate limit imports and configuration

// Dummy middleware that passes through (no rate limiting)
const noRateLimit = (req: Request, res: Response, next: NextFunction) => next();

// All rate limiters disabled for development
export const apiLimiter = noRateLimit;
export const authLimiter = noRateLimit;
export const signupLimiter = noRateLimit;
export const aiLimiter = noRateLimit;
export const uploadLimiter = noRateLimit;

// Password validation helper
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Minimum length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Maximum length check (prevent DoS)
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Number check
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>?/)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

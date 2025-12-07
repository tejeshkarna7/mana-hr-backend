import rateLimit from 'express-rate-limit';

const createRateLimit = (
  windowMs: number,
  max: number,
  message: string,
  skipSuccessfulRequests = false
) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
    },
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// General rate limiter - 100 requests per 15 minutes
export const generalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100,
  'Too many requests from this IP, please try again later.',
  false
);

// Auth rate limiter - 5 login attempts per 15 minutes
export const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5,
  'Too many authentication attempts from this IP, please try again after 15 minutes.',
  false
);

// Password reset rate limiter - 3 attempts per hour
export const passwordResetLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  3,
  'Too many password reset requests from this IP, please try again after an hour.',
  false
);

// File upload rate limiter - 20 uploads per hour
export const uploadLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  20,
  'Too many file upload requests from this IP, please try again later.',
  false
);

// API rate limiter - 1000 requests per hour
export const apiLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  1000,
  'API rate limit exceeded, please try again later.',
  false
);

// Strict rate limiter for sensitive operations - 10 requests per hour
export const strictLimiter = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10,
  'Rate limit exceeded for this operation, please try again later.',
  false
);

// Custom rate limiter factory
export const createCustomLimiter = (
  windowMs: number,
  max: number,
  message?: string,
  skipSuccessfulRequests = true
) => {
  return createRateLimit(
    windowMs,
    max,
    message || 'Rate limit exceeded, please try again later.',
    skipSuccessfulRequests
  );
};
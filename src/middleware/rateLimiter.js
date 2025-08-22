const rateLimit = require('express-rate-limit');
const config = require('../config/config');

// General rate limiting
const createRateLimiter = (windowMs, max, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
const rateLimiters = {
  // General API rate limiting
  general: createRateLimiter(
    config.rateLimit.windowMs,
    config.rateLimit.maxRequests,
    'Too many requests from this IP, please try again later'
  ),

  // Strict rate limiting for authentication endpoints
  auth: createRateLimiter(
    5 * 60 * 1000, // 5 minutes
    config.rateLimit.authMaxRequests,
    'Too many authentication attempts, please try again later'
  ),

  // More lenient for device operations
  device: createRateLimiter(
    60 * 1000, // 1 minute
    200, // Higher limit for device operations
    'Too many device requests, please slow down'
  ),

  // Very strict for export operations
  export: createRateLimiter(
    60 * 60 * 1000, // 1 hour
    10, // Only 10 exports per hour
    'Too many export requests, please wait before requesting another export'
  ),

  // Moderate for analytics
  analytics: createRateLimiter(
    60 * 1000, // 1 minute
    60, // 1 request per second average
    'Too many analytics requests, please reduce frequency'
  )
};

module.exports = rateLimiters;

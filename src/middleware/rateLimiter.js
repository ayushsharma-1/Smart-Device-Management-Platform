const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// Skip rate limiting in test environment
const skipRateLimit = process.env.NODE_ENV === 'test';

// Global rate limiter
const globalLimiter = rateLimit({
  skip: () => skipRateLimit,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Global rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later'
    });
  }
});

// User-specific rate limiter (for authenticated routes)
const userLimiter = rateLimit({
  skip: () => skipRateLimit,
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 100 requests per minute
  keyGenerator: (req) => {
    return req.user ? req.user.id.toString() : req.ip;
  },
  message: {
    success: false,
    message: 'Rate limit exceeded. Maximum 100 requests per minute allowed'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`User rate limit exceeded for user: ${req.user?.id || 'anonymous'}, IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Rate limit exceeded. Maximum 100 requests per minute allowed'
    });
  }
});

// Auth-specific rate limiter (stricter for login/signup)
const authLimiter = rateLimit({
  skip: () => skipRateLimit,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts, please try again later'
    });
  }
});

module.exports = globalLimiter;
module.exports.globalLimiter = globalLimiter;
module.exports.userLimiter = userLimiter;
module.exports.authLimiter = authLimiter;

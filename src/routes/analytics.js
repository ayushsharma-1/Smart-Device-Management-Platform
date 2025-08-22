const express = require('express');
const { query } = require('express-validator');
const analyticsController = require('../controllers/analyticsController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const rateLimiters = require('../middleware/rateLimiter');
const { cacheMiddlewares } = require('../middleware/cache');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Validation rules
const dateRangeValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

const periodValidation = [
  query('period')
    .optional()
    .isIn(['hour', 'day', 'week', 'month'])
    .withMessage('Period must be one of: hour, day, week, month')
];

const deviceIdsValidation = [
  query('deviceIds')
    .optional()
    .isString()
    .withMessage('Device IDs must be a comma-separated string')
    .custom((value) => {
      const ids = value.split(',');
      if (ids.some(id => !id.trim())) {
        throw new Error('Device IDs cannot be empty');
      }
      return true;
    })
];

// Routes

// Get dashboard summary (combines multiple analytics)
router.get('/dashboard', 
  rateLimiters.analytics,
  cacheMiddlewares.analytics,
  analyticsController.getDashboardSummary
);

// Get real-time metrics
router.get('/realtime', 
  rateLimiters.analytics,
  analyticsController.getRealTimeMetrics
);

// Get device analytics
router.get('/devices', 
  rateLimiters.analytics,
  dateRangeValidation,
  periodValidation,
  deviceIdsValidation,
  validateRequest,
  cacheMiddlewares.analytics,
  analyticsController.getDeviceAnalytics
);

// Get usage analytics
router.get('/usage', 
  rateLimiters.analytics,
  dateRangeValidation,
  validateRequest,
  cacheMiddlewares.analytics,
  analyticsController.getUsageAnalytics
);

// Get performance metrics (admin only)
router.get('/performance', 
  rateLimiters.analytics,
  authorize('admin'),
  analyticsController.getPerformanceMetrics
);

// Get cache performance (admin only)
router.get('/cache', 
  rateLimiters.analytics,
  authorize('admin'),
  analyticsController.getCachePerformance
);

module.exports = router;

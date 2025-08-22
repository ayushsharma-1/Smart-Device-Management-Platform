const express = require('express');
const { body, param, query } = require('express-validator');
const exportController = require('../controllers/exportController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const rateLimiters = require('../middleware/rateLimiter');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Validation rules
const createExportValidation = [
  body('type')
    .isIn(['device_logs', 'usage_report', 'device_list'])
    .withMessage('Invalid export type'),
  body('parameters.format')
    .optional()
    .isIn(['csv', 'json'])
    .withMessage('Format must be csv or json'),
  body('parameters.startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  body('parameters.endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.body.parameters?.startDate && new Date(endDate) <= new Date(req.body.parameters.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('parameters.deviceIds')
    .optional()
    .isArray()
    .withMessage('Device IDs must be an array'),
  body('parameters.deviceIds.*')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Each device ID must be a non-empty string')
];

const jobIdValidation = [
  param('jobId')
    .isUUID()
    .withMessage('Job ID must be a valid UUID')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

const bulkExportValidation = [
  body('exports')
    .isArray({ min: 1, max: 10 })
    .withMessage('Exports array is required and must contain 1-10 items'),
  body('exports.*.type')
    .isIn(['device_logs', 'usage_report', 'device_list'])
    .withMessage('Invalid export type'),
  body('exports.*.parameters')
    .isObject()
    .withMessage('Parameters must be an object')
];

// Routes

// Get supported export formats
router.get('/formats', 
  rateLimiters.general, 
  exportController.getExportFormats
);

// Get user's export jobs
router.get('/', 
  rateLimiters.general,
  paginationValidation,
  validateRequest,
  exportController.getUserExports
);

// Get export statistics
router.get('/stats', 
  rateLimiters.general,
  exportController.getExportStats
);

// Create new export job
router.post('/', 
  rateLimiters.export,
  createExportValidation,
  validateRequest,
  exportController.createExport
);

// Bulk export (admin only)
router.post('/bulk', 
  rateLimiters.export,
  authorize('admin'),
  bulkExportValidation,
  validateRequest,
  exportController.bulkExport
);

// Get export job status
router.get('/:jobId', 
  rateLimiters.general,
  jobIdValidation,
  validateRequest,
  exportController.getExportStatus
);

// Download export file
router.get('/:jobId/download', 
  rateLimiters.general,
  jobIdValidation,
  validateRequest,
  exportController.downloadExport
);

// Cancel export job
router.patch('/:jobId/cancel', 
  rateLimiters.general,
  jobIdValidation,
  validateRequest,
  exportController.cancelExport
);

// Delete export job
router.delete('/:jobId', 
  rateLimiters.general,
  jobIdValidation,
  validateRequest,
  exportController.deleteExport
);

module.exports = router;

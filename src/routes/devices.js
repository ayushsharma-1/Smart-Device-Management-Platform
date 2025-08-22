const express = require('express');
const { body, param, query } = require('express-validator');
const deviceController = require('../controllers/deviceController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/errorHandler');
const rateLimiters = require('../middleware/rateLimiter');
const { cacheMiddlewares } = require('../middleware/cache');

const router = express.Router();

// Apply authentication to all routes
router.use(authMiddleware);

// Validation rules
const deviceValidation = [
  body('deviceId')
    .notEmpty()
    .withMessage('Device ID is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Device ID must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Device ID can only contain letters, numbers, hyphens, and underscores'),
  body('name')
    .notEmpty()
    .withMessage('Device name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Device name must be between 1 and 100 characters'),
  body('type')
    .isIn(['sensor', 'actuator', 'gateway', 'camera', 'thermostat', 'light', 'lock', 'other'])
    .withMessage('Invalid device type'),
  body('status')
    .optional()
    .isIn(['online', 'offline', 'maintenance', 'error'])
    .withMessage('Invalid device status')
];

const updateDeviceValidation = [
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Device name must be between 1 and 100 characters'),
  body('type')
    .optional()
    .isIn(['sensor', 'actuator', 'gateway', 'camera', 'thermostat', 'light', 'lock', 'other'])
    .withMessage('Invalid device type'),
  body('status')
    .optional()
    .isIn(['online', 'offline', 'maintenance', 'error'])
    .withMessage('Invalid device status')
];

const statusUpdateValidation = [
  body('status')
    .isIn(['online', 'offline', 'maintenance', 'error'])
    .withMessage('Invalid device status')
];

const logEventValidation = [
  body('eventType')
    .isIn(['heartbeat', 'status_change', 'data_reading', 'error', 'command', 'configuration_change'])
    .withMessage('Invalid event type'),
  body('message')
    .notEmpty()
    .withMessage('Event message is required'),
  body('severity')
    .optional()
    .isIn(['info', 'warning', 'error', 'critical'])
    .withMessage('Invalid severity level')
];

const bulkUpdateValidation = [
  body('deviceIds')
    .isArray({ min: 1 })
    .withMessage('Device IDs array is required and must not be empty'),
  body('updates')
    .isObject()
    .withMessage('Updates object is required')
];

const deviceIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Device ID is required')
];

// Query validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

// Routes
// Get all devices (with caching)
router.get('/', 
  rateLimiters.device, 
  paginationValidation, 
  validateRequest, 
  cacheMiddlewares.devices, 
  deviceController.getDevices
);

// Get device statistics
router.get('/stats', 
  rateLimiters.device, 
  deviceController.getDeviceStats
);

// Get device types
router.get('/types', 
  rateLimiters.general, 
  deviceController.getDeviceTypes
);

// Get device statuses
router.get('/statuses', 
  rateLimiters.general, 
  deviceController.getDeviceStatuses
);

// Create new device
router.post('/', 
  rateLimiters.device,
  deviceValidation, 
  validateRequest, 
  deviceController.createDevice
);

// Bulk update devices (admin only)
router.patch('/bulk', 
  rateLimiters.device,
  authorize('admin'),
  bulkUpdateValidation,
  validateRequest,
  deviceController.bulkUpdateDevices
);

// Get specific device (with caching)
router.get('/:id', 
  rateLimiters.device,
  deviceIdValidation, 
  validateRequest, 
  cacheMiddlewares.device, 
  deviceController.getDevice
);

// Update device
router.put('/:id', 
  rateLimiters.device,
  deviceIdValidation,
  updateDeviceValidation, 
  validateRequest, 
  deviceController.updateDevice
);

// Update device status
router.patch('/:id/status', 
  rateLimiters.device,
  deviceIdValidation,
  statusUpdateValidation, 
  validateRequest, 
  deviceController.updateDeviceStatus
);

// Device heartbeat endpoint
router.post('/:id/heartbeat', 
  rateLimiters.device,
  deviceIdValidation, 
  validateRequest, 
  deviceController.deviceHeartbeat
);

// Get device logs
router.get('/:id/logs', 
  rateLimiters.device,
  deviceIdValidation,
  paginationValidation, 
  validateRequest, 
  deviceController.getDeviceLogs
);

// Log device event
router.post('/:id/logs', 
  rateLimiters.device,
  deviceIdValidation,
  logEventValidation, 
  validateRequest, 
  deviceController.logDeviceEvent
);

// Delete device
router.delete('/:id', 
  rateLimiters.device,
  deviceIdValidation, 
  validateRequest, 
  deviceController.deleteDevice
);

module.exports = router;

const express = require('express');
const deviceController = require('../controllers/deviceController');
const { authenticate } = require('../middleware/auth');
const { userLimiter } = require('../middleware/rateLimiter');
const { validate, validateQuery } = require('../validators');
const {
  deviceSchema,
  deviceUpdateSchema,
  heartbeatSchema,
  deviceLogSchema,
  querySchema,
  logsQuerySchema,
  usageQuerySchema
} = require('../validators/schemas');

const router = express.Router();

// Apply authentication and user rate limiter to all device routes
router.use(authenticate);
router.use(userLimiter);

// Device CRUD operations
router.post('/', validate(deviceSchema), deviceController.createDevice);
router.get('/', validateQuery(querySchema), deviceController.getDevices);
router.get('/:id', deviceController.getDevice);
router.patch('/:id', validate(deviceUpdateSchema), deviceController.updateDevice);
router.delete('/:id', deviceController.deleteDevice);

// Device heartbeat
router.post('/:id/heartbeat', validate(heartbeatSchema), deviceController.recordHeartbeat);

// Device logs and analytics
router.post('/:id/logs', validate(deviceLogSchema), deviceController.createDeviceLog);
router.get('/:id/logs', validateQuery(logsQuerySchema), deviceController.getDeviceLogs);
router.get('/:id/usage', validateQuery(usageQuerySchema), deviceController.getDeviceUsage);

module.exports = router;

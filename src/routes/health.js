const express = require('express');
const healthController = require('../controllers/healthController');
const { authMiddleware, authorize } = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public health endpoints
router.get('/', healthController.healthCheck);
router.get('/liveness', healthController.liveness);
router.get('/readiness', healthController.readiness);

// Protected endpoints (require authentication)
router.get('/detailed', authMiddleware, authorize('admin'), healthController.detailedHealthCheck);
router.get('/metrics', authMiddleware, authorize('admin'), healthController.getMetrics);

module.exports = router;

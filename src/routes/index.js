const express = require('express');
const config = require('../config/config');

const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const deviceRoutes = require('./devices');
const analyticsRoutes = require('./analytics');
const exportRoutes = require('./exports');
const healthRoutes = require('./health');

// API version and info
router.get('/', (req, res) => {
  res.json({
    name: 'Smart Device Management API',
    version: config.api.version,
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: `/api/${config.api.version}/auth`,
      devices: `/api/${config.api.version}/devices`,
      analytics: `/api/${config.api.version}/analytics`,
      exports: `/api/${config.api.version}/exports`,
      health: `/api/${config.api.version}/health`
    },
    documentation: 'https://github.com/your-repo/smart-device-backend#api-documentation',
    websocket: '/socket.io'
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/devices', deviceRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/exports', exportRoutes);
router.use('/health', healthRoutes);

module.exports = router;

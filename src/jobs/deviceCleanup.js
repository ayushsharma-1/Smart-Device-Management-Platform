const cron = require('node-cron');
const deviceService = require('../services/deviceService');
const logger = require('../utils/logger');

// Only start background jobs if not in test environment
if (process.env.NODE_ENV !== 'test') {
  // Run every hour to check for inactive devices
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Running device cleanup job...');
      
      const timeoutHours = parseInt(process.env.DEVICE_TIMEOUT_HOURS) || 24;
      const result = await deviceService.deactivateInactiveDevices(timeoutHours);
      
      if (result.count > 0) {
        logger.info(`Device cleanup completed: ${result.count} devices deactivated`, {
          deviceIds: result.devices
        });
      } else {
        logger.info('Device cleanup completed: No inactive devices found');
      }
    } catch (error) {
      logger.error('Device cleanup job failed:', error);
    }
  });

  // Run every 5 minutes for more frequent monitoring (optional)
  cron.schedule('*/5 * * * *', async () => {
    try {
      const inactiveDevices = await deviceService.getInactiveDevices(24);
      
      if (inactiveDevices.length > 0) {
        logger.warn(`Found ${inactiveDevices.length} inactive devices`, {
          deviceIds: inactiveDevices.map(d => d.id)
        });
      }
    } catch (error) {
      logger.error('Device monitoring job failed:', error);
    }
  });

  logger.info('Background jobs initialized');
} else {
  logger.info('Background jobs disabled for test environment');
}

module.exports = {};

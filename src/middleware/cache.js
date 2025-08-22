const redisClient = require('../config/redis');
const config = require('../config/config');

// Generic cache middleware factory
const createCacheMiddleware = (keyGenerator, ttl = 3600) => {
  return async (req, res, next) => {
    try {
      // Skip caching in development or if Redis is not available
      if (config.nodeEnv === 'development' || !redisClient.isHealthy()) {
        return next();
      }

      const cacheKey = keyGenerator(req);
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        // Add cache hit header
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }

      // Store original json method
      const originalJson = res.json;

      // Override json method to cache the response
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.set(cacheKey, data, ttl).catch(console.error);
        }
        
        // Add cache miss header
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        
        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Cache key generators
const keyGenerators = {
  devices: (req) => {
    const { page = 1, limit = 10, search = '', type = '', status = '', organization = '' } = req.query;
    const userId = req.user?.id || 'anonymous';
    return `devices:${userId}:${page}:${limit}:${search}:${type}:${status}:${organization}`;
  },

  device: (req) => {
    const deviceId = req.params.id;
    return `device:${deviceId}`;
  },

  userDevices: (req) => {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    return `user_devices:${userId}:${page}:${limit}`;
  },

  analytics: (req) => {
    const { type, period, deviceId, organization } = req.query;
    const userId = req.user?.id || 'anonymous';
    return `analytics:${type}:${period}:${deviceId}:${organization}:${userId}`;
  },

  userProfile: (req) => {
    const userId = req.params.id || req.user.id;
    return `user:${userId}`;
  }
};

// Pre-configured cache middlewares
const cacheMiddlewares = {
  devices: createCacheMiddleware(keyGenerators.devices, config.cache.deviceTTL),
  device: createCacheMiddleware(keyGenerators.device, config.cache.deviceTTL),
  userDevices: createCacheMiddleware(keyGenerators.userDevices, config.cache.deviceTTL),
  analytics: createCacheMiddleware(keyGenerators.analytics, config.cache.analyticsTTL),
  userProfile: createCacheMiddleware(keyGenerators.userProfile, config.cache.userTTL)
};

// Cache invalidation helpers
const invalidateCache = {
  device: async (deviceId) => {
    try {
      await redisClient.invalidatePattern(`device:${deviceId}*`);
      await redisClient.invalidatePattern(`devices:*`);
      await redisClient.invalidatePattern(`user_devices:*`);
      await redisClient.invalidatePattern(`analytics:*`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  },

  user: async (userId) => {
    try {
      await redisClient.invalidatePattern(`user:${userId}*`);
      await redisClient.invalidatePattern(`user_devices:${userId}*`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  },

  devices: async () => {
    try {
      await redisClient.invalidatePattern(`devices:*`);
      await redisClient.invalidatePattern(`user_devices:*`);
      await redisClient.invalidatePattern(`analytics:*`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  },

  analytics: async () => {
    try {
      await redisClient.invalidatePattern(`analytics:*`);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
};

module.exports = {
  createCacheMiddleware,
  cacheMiddlewares,
  invalidateCache,
  keyGenerators
};

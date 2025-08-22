const database = require('../config/database');
const redisClient = require('../config/redis');
const websocketService = require('../services/websocketService');

class HealthController {
  // Health check endpoint
  async healthCheck(req, res, next) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      res.json({
        success: true,
        data: { health }
      });
    } catch (error) {
      next(error);
    }
  }

  // Detailed health check with dependencies
  async detailedHealthCheck(req, res, next) {
    try {
      const dependencies = await this.checkDependencies();
      
      const overallStatus = dependencies.every(dep => dep.healthy) ? 'healthy' : 'unhealthy';
      const statusCode = overallStatus === 'healthy' ? 200 : 503;

      const health = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        dependencies
      };

      res.status(statusCode).json({
        success: overallStatus === 'healthy',
        data: { health }
      });
    } catch (error) {
      next(error);
    }
  }

  // Check all dependencies
  async checkDependencies() {
    const dependencies = [];

    // Check MongoDB
    try {
      const mongoStatus = database.connection?.readyState === 1;
      dependencies.push({
        name: 'MongoDB',
        healthy: mongoStatus,
        status: mongoStatus ? 'connected' : 'disconnected',
        responseTime: mongoStatus ? await this.getMongoPingTime() : null
      });
    } catch (error) {
      dependencies.push({
        name: 'MongoDB',
        healthy: false,
        status: 'error',
        error: error.message
      });
    }

    // Check Redis
    try {
      const redisHealthy = redisClient.isHealthy();
      dependencies.push({
        name: 'Redis',
        healthy: redisHealthy,
        status: redisHealthy ? 'connected' : 'disconnected',
        responseTime: redisHealthy ? await this.getRedisPingTime() : null
      });
    } catch (error) {
      dependencies.push({
        name: 'Redis',
        healthy: false,
        status: 'error',
        error: error.message
      });
    }

    // Check WebSocket service
    try {
      const wsConnections = websocketService.getConnectionStats();
      dependencies.push({
        name: 'WebSocket',
        healthy: true,
        status: 'running',
        connections: wsConnections.totalConnections,
        uniqueUsers: wsConnections.uniqueUsers
      });
    } catch (error) {
      dependencies.push({
        name: 'WebSocket',
        healthy: false,
        status: 'error',
        error: error.message
      });
    }

    return dependencies;
  }

  // Get MongoDB ping time
  async getMongoPingTime() {
    const start = process.hrtime();
    await database.connection.db.admin().ping();
    const [seconds, nanoseconds] = process.hrtime(start);
    return (seconds * 1000 + nanoseconds / 1000000).toFixed(2);
  }

  // Get Redis ping time
  async getRedisPingTime() {
    try {
      const start = process.hrtime();
      await redisClient.getClient().ping();
      const [seconds, nanoseconds] = process.hrtime(start);
      return (seconds * 1000 + nanoseconds / 1000000).toFixed(2);
    } catch (error) {
      return null;
    }
  }

  // Get system metrics
  async getMetrics(req, res, next) {
    try {
      const metrics = {
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          platform: process.platform,
          nodeVersion: process.version,
          pid: process.pid
        },
        application: {
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || '1.0.0',
          startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
        },
        websocket: websocketService.getConnectionStats(),
        requests: this.getRequestMetrics()
      };

      res.json({
        success: true,
        data: { metrics }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get request metrics from global metrics store
  getRequestMetrics() {
    const metrics = global.metrics || [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Filter metrics from last hour
    const recentMetrics = metrics.filter(m => m.timestamp >= oneHourAgo);

    if (recentMetrics.length === 0) {
      return {
        total: 0,
        avgResponseTime: 0,
        requestsPerMinute: 0,
        statusCodes: {}
      };
    }

    // Calculate metrics
    const totalRequests = recentMetrics.length;
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const requestsPerMinute = totalRequests / 60;

    // Group by status code
    const statusCodes = recentMetrics.reduce((acc, m) => {
      acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
      return acc;
    }, {});

    return {
      total: totalRequests,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
      statusCodes
    };
  }

  // Readiness probe (Kubernetes)
  async readiness(req, res, next) {
    try {
      const dependencies = await this.checkDependencies();
      const criticalDeps = dependencies.filter(dep => dep.name === 'MongoDB');
      
      const ready = criticalDeps.every(dep => dep.healthy);
      const statusCode = ready ? 200 : 503;

      res.status(statusCode).json({
        ready,
        timestamp: new Date().toISOString(),
        dependencies: dependencies.map(dep => ({
          name: dep.name,
          healthy: dep.healthy
        }))
      });
    } catch (error) {
      res.status(503).json({
        ready: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Liveness probe (Kubernetes)
  async liveness(req, res, next) {
    try {
      res.json({
        alive: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(503).json({
        alive: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new HealthController();

const analyticsService = require('../services/analyticsService');

class AnalyticsController {
  // Get device analytics
  async getDeviceAnalytics(req, res, next) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        deviceIds: req.query.deviceIds ? req.query.deviceIds.split(',') : [],
        organization: req.query.organization,
        period: req.query.period || 'day'
      };

      const analytics = await analyticsService.getDeviceAnalytics(filters, req.user);

      res.json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get usage analytics
  async getUsageAnalytics(req, res, next) {
    try {
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        organization: req.query.organization
      };

      const analytics = await analyticsService.getUsageAnalytics(filters, req.user);

      res.json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get real-time metrics
  async getRealTimeMetrics(req, res, next) {
    try {
      const metrics = await analyticsService.getRealTimeMetrics(req.user);

      res.json({
        success: true,
        data: { metrics }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get dashboard summary
  async getDashboardSummary(req, res, next) {
    try {
      const [deviceAnalytics, usageAnalytics, realTimeMetrics] = await Promise.all([
        analyticsService.getDeviceAnalytics({
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          period: 'day'
        }, req.user),
        analyticsService.getUsageAnalytics({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }, req.user),
        analyticsService.getRealTimeMetrics(req.user)
      ]);

      res.json({
        success: true,
        data: {
          summary: {
            devices: deviceAnalytics,
            usage: usageAnalytics,
            realTime: realTimeMetrics
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get performance metrics
  async getPerformanceMetrics(req, res, next) {
    try {
      // Get metrics from global metrics store
      const metrics = global.metrics || [];
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Filter metrics from last hour
      const recentMetrics = metrics.filter(m => m.timestamp >= oneHourAgo);

      // Calculate average response time
      const responseTimes = recentMetrics.map(m => m.responseTime);
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
        : 0;

      // Calculate requests per minute
      const requestsPerMinute = recentMetrics.length / 60;

      // Group by status code
      const statusCounts = recentMetrics.reduce((acc, m) => {
        acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
        return acc;
      }, {});

      // Get slow requests (> 100ms)
      const slowRequests = recentMetrics
        .filter(m => m.responseTime > 100)
        .sort((a, b) => b.responseTime - a.responseTime)
        .slice(0, 10);

      // Most accessed endpoints
      const endpointCounts = recentMetrics.reduce((acc, m) => {
        const endpoint = `${m.method} ${m.url}`;
        acc[endpoint] = (acc[endpoint] || 0) + 1;
        return acc;
      }, {});

      const topEndpoints = Object.entries(endpointCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([endpoint, count]) => ({ endpoint, count }));

      res.json({
        success: true,
        data: {
          performance: {
            avgResponseTime: Math.round(avgResponseTime * 100) / 100,
            requestsPerMinute: Math.round(requestsPerMinute * 100) / 100,
            totalRequests: recentMetrics.length,
            statusCodes: statusCounts,
            slowRequests: slowRequests.map(r => ({
              method: r.method,
              url: r.url,
              responseTime: r.responseTime,
              timestamp: r.timestamp
            })),
            topEndpoints
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get cache performance
  async getCachePerformance(req, res, next) {
    try {
      // This would typically come from Redis metrics or a monitoring system
      // For now, we'll simulate cache metrics
      const cacheMetrics = {
        hitRate: 85.5, // Percentage
        missRate: 14.5, // Percentage
        totalRequests: 1250,
        hits: 1069,
        misses: 181,
        avgResponseTime: {
          hit: 12.5, // ms
          miss: 89.3  // ms
        },
        topCachedKeys: [
          { key: 'devices:*', hits: 245 },
          { key: 'analytics:*', hits: 189 },
          { key: 'user:*', hits: 156 }
        ]
      };

      res.json({
        success: true,
        data: { cacheMetrics }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AnalyticsController();

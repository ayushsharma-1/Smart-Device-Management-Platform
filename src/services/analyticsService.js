const Device = require('../models/Device');
const DeviceLog = require('../models/DeviceLog');
const User = require('../models/User');

class AnalyticsService {
  // Get device analytics
  async getDeviceAnalytics(filters = {}, user) {
    try {
      const {
        startDate,
        endDate,
        deviceIds = [],
        organization = '',
        period = 'day' // day, week, month
      } = filters;

      // Build base query
      let deviceQuery = { isActive: true };
      
      // Apply organization filter
      if (user.role !== 'admin') {
        deviceQuery.organization = user.organization;
      } else if (organization) {
        deviceQuery.organization = organization;
      }

      // Apply user filter for regular users
      if (user.role === 'user') {
        deviceQuery.owner = user._id;
      }

      // Filter by specific devices
      if (deviceIds.length > 0) {
        deviceQuery.deviceId = { $in: deviceIds };
      }

      // Get devices
      const devices = await Device.find(deviceQuery).select('deviceId name type status');
      const deviceObjectIds = devices.map(d => d._id);

      // Build date query
      let dateQuery = {};
      if (startDate || endDate) {
        dateQuery.timestamp = {};
        if (startDate) {
          dateQuery.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          dateQuery.timestamp.$lte = new Date(endDate);
        }
      } else {
        // Default to last 30 days
        dateQuery.timestamp = {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        };
      }

      // Get log analytics
      const logQuery = {
        device: { $in: deviceObjectIds },
        ...dateQuery
      };

      const [
        eventCounts,
        severityCounts,
        timelineData,
        errorTrends
      ] = await Promise.all([
        this.getEventCounts(logQuery),
        this.getSeverityCounts(logQuery),
        this.getTimelineData(logQuery, period),
        this.getErrorTrends(logQuery, period)
      ]);

      return {
        devices: devices.length,
        analytics: {
          events: eventCounts,
          severity: severityCounts,
          timeline: timelineData,
          errors: errorTrends
        },
        period,
        dateRange: {
          start: dateQuery.timestamp.$gte,
          end: dateQuery.timestamp.$lte || new Date()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get event counts by type
  async getEventCounts(query) {
    const result = await DeviceLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return result.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  }

  // Get severity counts
  async getSeverityCounts(query) {
    const result = await DeviceLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    return result.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});
  }

  // Get timeline data
  async getTimelineData(query, period) {
    let groupFormat;
    switch (period) {
      case 'hour':
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        };
        break;
      case 'week':
        groupFormat = {
          year: { $year: '$timestamp' },
          week: { $week: '$timestamp' }
        };
        break;
      case 'month':
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' }
        };
        break;
      default: // day
        groupFormat = {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        };
    }

    const result = await DeviceLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: groupFormat,
          events: { $sum: 1 },
          errors: {
            $sum: {
              $cond: [{ $eq: ['$severity', 'error'] }, 1, 0]
            }
          },
          warnings: {
            $sum: {
              $cond: [{ $eq: ['$severity', 'warning'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
    ]);

    return result.map(item => {
      let date;
      if (period === 'hour') {
        date = new Date(item._id.year, item._id.month - 1, item._id.day, item._id.hour);
      } else if (period === 'week') {
        date = new Date(item._id.year, 0, 1 + (item._id.week - 1) * 7);
      } else if (period === 'month') {
        date = new Date(item._id.year, item._id.month - 1, 1);
      } else {
        date = new Date(item._id.year, item._id.month - 1, item._id.day);
      }

      return {
        date: date.toISOString(),
        events: item.events,
        errors: item.errors,
        warnings: item.warnings
      };
    });
  }

  // Get error trends
  async getErrorTrends(query, period) {
    const errorQuery = { ...query, severity: { $in: ['error', 'critical'] } };
    
    const result = await DeviceLog.aggregate([
      { $match: errorQuery },
      {
        $group: {
          _id: '$deviceId',
          errorCount: { $sum: 1 },
          lastError: { $max: '$timestamp' },
          errorTypes: { $addToSet: '$eventType' }
        }
      },
      {
        $lookup: {
          from: 'devices',
          localField: '_id',
          foreignField: 'deviceId',
          as: 'device'
        }
      },
      { $unwind: '$device' },
      { $sort: { errorCount: -1 } },
      { $limit: 10 }
    ]);

    return result.map(item => ({
      deviceId: item._id,
      deviceName: item.device.name,
      errorCount: item.errorCount,
      lastError: item.lastError,
      errorTypes: item.errorTypes
    }));
  }

  // Get usage analytics
  async getUsageAnalytics(filters = {}, user) {
    try {
      const {
        startDate,
        endDate,
        organization = ''
      } = filters;

      // Build base query
      let deviceQuery = { isActive: true };
      
      // Apply organization filter
      if (user.role !== 'admin') {
        deviceQuery.organization = user.organization;
      } else if (organization) {
        deviceQuery.organization = organization;
      }

      // Apply user filter for regular users
      if (user.role === 'user') {
        deviceQuery.owner = user._id;
      }

      // Date range for logs
      let dateQuery = {};
      if (startDate || endDate) {
        dateQuery.timestamp = {};
        if (startDate) {
          dateQuery.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          dateQuery.timestamp.$lte = new Date(endDate);
        }
      } else {
        // Default to last 30 days
        dateQuery.timestamp = {
          $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        };
      }

      const [
        deviceStats,
        activityStats,
        organizationStats
      ] = await Promise.all([
        this.getDeviceUsageStats(deviceQuery, dateQuery),
        this.getActivityStats(deviceQuery, dateQuery),
        this.getOrganizationStats(user)
      ]);

      return {
        devices: deviceStats,
        activity: activityStats,
        organizations: organizationStats,
        dateRange: {
          start: dateQuery.timestamp.$gte,
          end: dateQuery.timestamp.$lte || new Date()
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get device usage statistics
  async getDeviceUsageStats(deviceQuery, dateQuery) {
    const devices = await Device.find(deviceQuery);
    const deviceIds = devices.map(d => d._id);

    const logQuery = {
      device: { $in: deviceIds },
      ...dateQuery
    };

    const stats = await DeviceLog.aggregate([
      { $match: logQuery },
      {
        $lookup: {
          from: 'devices',
          localField: 'device',
          foreignField: '_id',
          as: 'deviceInfo'
        }
      },
      { $unwind: '$deviceInfo' },
      {
        $group: {
          _id: '$deviceInfo.type',
          count: { $sum: 1 },
          devices: { $addToSet: '$deviceInfo._id' },
          lastActivity: { $max: '$timestamp' }
        }
      }
    ]);

    return stats.map(stat => ({
      type: stat._id,
      eventCount: stat.count,
      deviceCount: stat.devices.length,
      lastActivity: stat.lastActivity
    }));
  }

  // Get activity statistics
  async getActivityStats(deviceQuery, dateQuery) {
    const devices = await Device.find(deviceQuery);
    const deviceIds = devices.map(d => d._id);

    const logQuery = {
      device: { $in: deviceIds },
      ...dateQuery
    };

    const activityByHour = await DeviceLog.aggregate([
      { $match: logQuery },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const activityByDay = await DeviceLog.aggregate([
      { $match: logQuery },
      {
        $group: {
          _id: { $dayOfWeek: '$timestamp' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    return {
      byHour: activityByHour.map(item => ({
        hour: item._id,
        count: item.count
      })),
      byDay: activityByDay.map(item => ({
        day: item._id,
        count: item.count
      }))
    };
  }

  // Get organization statistics
  async getOrganizationStats(user) {
    if (user.role !== 'admin') {
      return null;
    }

    const stats = await Device.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$organization',
          deviceCount: { $sum: 1 },
          onlineDevices: {
            $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] }
          },
          offlineDevices: {
            $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] }
          }
        }
      },
      { $sort: { deviceCount: -1 } }
    ]);

    return stats.map(stat => ({
      organization: stat._id,
      deviceCount: stat.deviceCount,
      onlineDevices: stat.onlineDevices,
      offlineDevices: stat.offlineDevices,
      onlinePercentage: stat.deviceCount > 0 ? (stat.onlineDevices / stat.deviceCount * 100).toFixed(2) : 0
    }));
  }

  // Get real-time metrics
  async getRealTimeMetrics(user) {
    try {
      // Build base query
      let deviceQuery = { isActive: true };
      
      // Apply organization filter
      if (user.role !== 'admin') {
        deviceQuery.organization = user.organization;
      }

      // Apply user filter for regular users
      if (user.role === 'user') {
        deviceQuery.owner = user._id;
      }

      const [
        deviceCounts,
        recentActivity,
        systemHealth
      ] = await Promise.all([
        this.getDeviceCounts(deviceQuery),
        this.getRecentActivity(deviceQuery),
        this.getSystemHealth(deviceQuery)
      ]);

      return {
        devices: deviceCounts,
        activity: recentActivity,
        health: systemHealth,
        timestamp: new Date()
      };
    } catch (error) {
      throw error;
    }
  }

  // Get device counts by status
  async getDeviceCounts(query) {
    const result = await Device.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const counts = result.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    return {
      online: counts.online || 0,
      offline: counts.offline || 0,
      maintenance: counts.maintenance || 0,
      error: counts.error || 0,
      total: Object.values(counts).reduce((sum, count) => sum + count, 0)
    };
  }

  // Get recent activity
  async getRecentActivity(deviceQuery) {
    const devices = await Device.find(deviceQuery).select('_id');
    const deviceIds = devices.map(d => d._id);

    const recentLogs = await DeviceLog.find({
      device: { $in: deviceIds },
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    })
    .sort({ timestamp: -1 })
    .limit(10)
    .populate('device', 'deviceId name type')
    .lean();

    return recentLogs.map(log => ({
      deviceId: log.device.deviceId,
      deviceName: log.device.name,
      eventType: log.eventType,
      message: log.message,
      severity: log.severity,
      timestamp: log.timestamp
    }));
  }

  // Get system health metrics
  async getSystemHealth(deviceQuery) {
    const devices = await Device.find(deviceQuery);
    const deviceIds = devices.map(d => d._id);

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      errorCount,
      warningCount,
      recentErrors
    ] = await Promise.all([
      DeviceLog.countDocuments({
        device: { $in: deviceIds },
        severity: 'error',
        timestamp: { $gte: oneHourAgo }
      }),
      DeviceLog.countDocuments({
        device: { $in: deviceIds },
        severity: 'warning',
        timestamp: { $gte: oneHourAgo }
      }),
      DeviceLog.find({
        device: { $in: deviceIds },
        severity: { $in: ['error', 'critical'] },
        timestamp: { $gte: oneHourAgo }
      })
      .sort({ timestamp: -1 })
      .limit(5)
      .populate('device', 'deviceId name')
      .lean()
    ]);

    return {
      errorsLastHour: errorCount,
      warningsLastHour: warningCount,
      recentErrors: recentErrors.map(error => ({
        deviceId: error.device.deviceId,
        deviceName: error.device.name,
        message: error.message,
        timestamp: error.timestamp
      }))
    };
  }
}

module.exports = new AnalyticsService();

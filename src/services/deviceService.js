const Device = require('../models/Device');
const DeviceLog = require('../models/DeviceLog');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');
const { invalidateCache } = require('../middleware/cache');

class DeviceService {
  // Get devices with filtering, pagination and search
  async getDevices(filters = {}, pagination = {}, user) {
    try {
      const {
        search = '',
        type = '',
        status = '',
        organization = '',
        owner = '',
        location = ''
      } = filters;

      const {
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = pagination;

      // Build query
      let query = { isActive: true };

      // Organization filter based on user role
      if (user.role !== 'admin') {
        query.organization = user.organization;
      } else if (organization) {
        query.organization = organization;
      }

      // Owner filter
      if (owner) {
        query.owner = owner;
      } else if (user.role === 'user') {
        // Regular users can only see their own devices
        query.owner = user._id;
      }

      // Type filter
      if (type) {
        query.type = type;
      }

      // Status filter
      if (status) {
        query.status = status;
      }

      // Location filter
      if (location) {
        query.$or = [
          { 'location.building': { $regex: location, $options: 'i' } },
          { 'location.room': { $regex: location, $options: 'i' } },
          { 'location.floor': { $regex: location, $options: 'i' } }
        ];
      }

      // Search filter
      if (search) {
        query.$and = query.$and || [];
        query.$and.push({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { deviceId: { $regex: search, $options: 'i' } },
            { 'specifications.manufacturer': { $regex: search, $options: 'i' } },
            { 'specifications.model': { $regex: search, $options: 'i' } }
          ]
        });
      }

      // Calculate skip and limit
      const skip = (page - 1) * limit;
      const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Execute query
      const [devices, total] = await Promise.all([
        Device.find(query)
          .populate('owner', 'username email organization')
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Device.countDocuments(query)
      ]);

      return {
        devices,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Get device by ID
  async getDeviceById(deviceId, user) {
    try {
      let query = { deviceId, isActive: true };

      // Apply organization filter
      if (user.role !== 'admin') {
        query.organization = user.organization;
      }

      const device = await Device.findOne(query)
        .populate('owner', 'username email organization');

      if (!device) {
        throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
      }

      // Check ownership for regular users
      if (user.role === 'user' && device.owner._id.toString() !== user._id.toString()) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      return device;
    } catch (error) {
      throw error;
    }
  }

  // Create new device
  async createDevice(deviceData, user) {
    try {
      // Check if device ID already exists
      const existingDevice = await Device.findOne({ deviceId: deviceData.deviceId });
      if (existingDevice) {
        throw new AppError('Device ID already exists', 409, 'DEVICE_EXISTS');
      }

      // Set owner and organization
      deviceData.owner = deviceData.owner || user._id;
      deviceData.organization = user.organization;

      // Validate owner belongs to same organization (for admins)
      if (deviceData.owner !== user._id.toString() && user.role !== 'admin') {
        const owner = await User.findById(deviceData.owner);
        if (!owner || owner.organization !== user.organization) {
          throw new AppError('Invalid owner', 400, 'INVALID_OWNER');
        }
      }

      const device = new Device(deviceData);
      await device.save();

      // Populate owner info
      await device.populate('owner', 'username email organization');

      // Log device creation
      await this.logDeviceEvent(device.deviceId, 'configuration_change', 'Device created', {
        createdBy: user.username,
        deviceData: device.toObject()
      });

      // Invalidate cache
      await invalidateCache.devices();

      return device;
    } catch (error) {
      throw error;
    }
  }

  // Update device
  async updateDevice(deviceId, updateData, user) {
    try {
      const device = await this.getDeviceById(deviceId, user);

      // Check permissions
      if (user.role === 'user' && device.owner._id.toString() !== user._id.toString()) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      // Don't allow changing deviceId or organization
      delete updateData.deviceId;
      delete updateData.organization;

      // Validate owner if being changed
      if (updateData.owner && updateData.owner !== device.owner._id.toString()) {
        const newOwner = await User.findById(updateData.owner);
        if (!newOwner || newOwner.organization !== device.organization) {
          throw new AppError('Invalid owner', 400, 'INVALID_OWNER');
        }
      }

      // Update device
      Object.assign(device, updateData);
      await device.save();

      // Log update
      await this.logDeviceEvent(device.deviceId, 'configuration_change', 'Device updated', {
        updatedBy: user.username,
        changes: updateData
      });

      // Invalidate cache
      await invalidateCache.device(deviceId);
      await invalidateCache.devices();

      return device;
    } catch (error) {
      throw error;
    }
  }

  // Delete device
  async deleteDevice(deviceId, user) {
    try {
      const device = await this.getDeviceById(deviceId, user);

      // Check permissions
      if (user.role === 'user' && device.owner._id.toString() !== user._id.toString()) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
      }

      // Soft delete
      device.isActive = false;
      await device.save();

      // Log deletion
      await this.logDeviceEvent(device.deviceId, 'configuration_change', 'Device deleted', {
        deletedBy: user.username
      });

      // Invalidate cache
      await invalidateCache.device(deviceId);
      await invalidateCache.devices();

      return { success: true };
    } catch (error) {
      throw error;
    }
  }

  // Update device status
  async updateDeviceStatus(deviceId, status, user) {
    try {
      const device = await this.getDeviceById(deviceId, user);

      const oldStatus = device.status;
      await device.updateStatus(status);

      // Log status change
      await this.logDeviceEvent(device.deviceId, 'status_change', `Status changed from ${oldStatus} to ${status}`, {
        oldStatus,
        newStatus: status,
        changedBy: user.username
      });

      // Invalidate cache
      await invalidateCache.device(deviceId);
      await invalidateCache.devices();

      return device;
    } catch (error) {
      throw error;
    }
  }

  // Update device heartbeat
  async updateHeartbeat(deviceId, data = {}) {
    try {
      const device = await Device.findOne({ deviceId, isActive: true });
      if (!device) {
        throw new AppError('Device not found', 404, 'DEVICE_NOT_FOUND');
      }

      await device.updateHeartbeat();

      // Log heartbeat
      await this.logDeviceEvent(device.deviceId, 'heartbeat', 'Device heartbeat received', data);

      // Invalidate cache
      await invalidateCache.device(deviceId);

      return device;
    } catch (error) {
      throw error;
    }
  }

  // Get device logs
  async getDeviceLogs(deviceId, filters = {}, pagination = {}, user) {
    try {
      // Verify device access
      await this.getDeviceById(deviceId, user);

      const {
        eventType = '',
        severity = '',
        startDate,
        endDate
      } = filters;

      const {
        page = 1,
        limit = 50,
        sortOrder = 'desc'
      } = pagination;

      // Build query
      let query = { deviceId };

      if (eventType) {
        query.eventType = eventType;
      }

      if (severity) {
        query.severity = severity;
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) {
          query.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          query.timestamp.$lte = new Date(endDate);
        }
      }

      const skip = (page - 1) * limit;
      const sortOptions = { timestamp: sortOrder === 'desc' ? -1 : 1 };

      const [logs, total] = await Promise.all([
        DeviceLog.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        DeviceLog.countDocuments(query)
      ]);

      return {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Log device event
  async logDeviceEvent(deviceId, eventType, message, data = {}, severity = 'info') {
    try {
      const device = await Device.findOne({ deviceId });
      if (!device) {
        console.warn(`Attempted to log event for non-existent device: ${deviceId}`);
        return;
      }

      const log = new DeviceLog({
        deviceId,
        device: device._id,
        eventType,
        message,
        data,
        severity,
        timestamp: new Date()
      });

      await log.save();
      return log;
    } catch (error) {
      console.error('Error logging device event:', error);
      throw error;
    }
  }

  // Get device statistics
  async getDeviceStats(user) {
    try {
      let matchQuery = { isActive: true };

      // Apply organization filter
      if (user.role !== 'admin') {
        matchQuery.organization = user.organization;
      }

      if (user.role === 'user') {
        matchQuery.owner = user._id;
      }

      const stats = await Device.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            online: {
              $sum: {
                $cond: [{ $eq: ['$status', 'online'] }, 1, 0]
              }
            },
            offline: {
              $sum: {
                $cond: [{ $eq: ['$status', 'offline'] }, 1, 0]
              }
            },
            maintenance: {
              $sum: {
                $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0]
              }
            },
            error: {
              $sum: {
                $cond: [{ $eq: ['$status', 'error'] }, 1, 0]
              }
            }
          }
        }
      ]);

      const typeStats = await Device.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);

      return {
        overview: stats[0] || { total: 0, online: 0, offline: 0, maintenance: 0, error: 0 },
        byType: typeStats
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new DeviceService();

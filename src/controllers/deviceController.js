const deviceService = require('../services/deviceService');
const websocketService = require('../services/websocketService');
const { invalidateCache } = require('../middleware/cache');

class DeviceController {
  // Get all devices with filtering and pagination
  async getDevices(req, res, next) {
    try {
      const filters = {
        search: req.query.search,
        type: req.query.type,
        status: req.query.status,
        organization: req.query.organization,
        owner: req.query.owner,
        location: req.query.location
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await deviceService.getDevices(filters, pagination, req.user);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Get device by ID
  async getDevice(req, res, next) {
    try {
      const device = await deviceService.getDeviceById(req.params.id, req.user);

      res.json({
        success: true,
        data: { device }
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new device
  async createDevice(req, res, next) {
    try {
      const device = await deviceService.createDevice(req.body, req.user);

      // Broadcast device creation to organization
      websocketService.broadcastToOrganization(req.user.organization, 'device:created', {
        device,
        createdBy: req.user.username,
        timestamp: new Date()
      });

      res.status(201).json({
        success: true,
        message: 'Device created successfully',
        data: { device }
      });
    } catch (error) {
      next(error);
    }
  }

  // Update device
  async updateDevice(req, res, next) {
    try {
      const device = await deviceService.updateDevice(req.params.id, req.body, req.user);

      // Broadcast device update to organization
      websocketService.broadcastToOrganization(req.user.organization, 'device:updated', {
        device,
        updatedBy: req.user.username,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: 'Device updated successfully',
        data: { device }
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete device
  async deleteDevice(req, res, next) {
    try {
      await deviceService.deleteDevice(req.params.id, req.user);

      // Broadcast device deletion to organization
      websocketService.broadcastToOrganization(req.user.organization, 'device:deleted', {
        deviceId: req.params.id,
        deletedBy: req.user.username,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: 'Device deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Update device status
  async updateDeviceStatus(req, res, next) {
    try {
      const { status } = req.body;
      const device = await deviceService.updateDeviceStatus(req.params.id, status, req.user);

      // Broadcast status change
      websocketService.broadcastDeviceStatusChange(
        device.deviceId,
        device.organization,
        req.body.oldStatus || 'unknown',
        status,
        { updatedBy: req.user.username }
      );

      res.json({
        success: true,
        message: 'Device status updated successfully',
        data: { device }
      });
    } catch (error) {
      next(error);
    }
  }

  // Device heartbeat endpoint
  async deviceHeartbeat(req, res, next) {
    try {
      const { deviceId } = req.params;
      const heartbeatData = req.body;

      const device = await deviceService.updateHeartbeat(deviceId, heartbeatData);

      // Broadcast heartbeat to organization
      websocketService.broadcastDeviceHeartbeat(
        device.deviceId,
        device.organization,
        heartbeatData
      );

      res.json({
        success: true,
        message: 'Heartbeat received',
        data: {
          deviceId: device.deviceId,
          status: device.status,
          lastSeen: device.connectivity.lastSeen
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get device logs
  async getDeviceLogs(req, res, next) {
    try {
      const filters = {
        eventType: req.query.eventType,
        severity: req.query.severity,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      };

      const pagination = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        sortOrder: req.query.sortOrder || 'desc'
      };

      const result = await deviceService.getDeviceLogs(req.params.id, filters, pagination, req.user);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Log device event (for external systems)
  async logDeviceEvent(req, res, next) {
    try {
      const { deviceId } = req.params;
      const { eventType, message, data, severity } = req.body;

      const log = await deviceService.logDeviceEvent(deviceId, eventType, message, data, severity);

      // If it's an error, broadcast it
      if (severity === 'error' || severity === 'critical') {
        const device = await deviceService.getDeviceById(deviceId, req.user);
        websocketService.broadcastDeviceError(device.deviceId, device.organization, {
          message,
          severity,
          data
        });
      }

      res.json({
        success: true,
        message: 'Event logged successfully',
        data: { log }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get device statistics
  async getDeviceStats(req, res, next) {
    try {
      const stats = await deviceService.getDeviceStats(req.user);

      res.json({
        success: true,
        data: { stats }
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk update devices
  async bulkUpdateDevices(req, res, next) {
    try {
      const { deviceIds, updates } = req.body;
      const results = [];

      for (const deviceId of deviceIds) {
        try {
          const device = await deviceService.updateDevice(deviceId, updates, req.user);
          results.push({ deviceId, success: true, device });
        } catch (error) {
          results.push({ deviceId, success: false, error: error.message });
        }
      }

      // Invalidate cache for bulk updates
      await invalidateCache.devices();

      // Broadcast bulk update
      websocketService.broadcastToOrganization(req.user.organization, 'devices:bulk_updated', {
        deviceIds,
        updates,
        updatedBy: req.user.username,
        timestamp: new Date()
      });

      res.json({
        success: true,
        message: 'Bulk update completed',
        data: { results }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get device types
  async getDeviceTypes(req, res, next) {
    try {
      const types = [
        'sensor',
        'actuator',
        'gateway',
        'camera',
        'thermostat',
        'light',
        'lock',
        'other'
      ];

      res.json({
        success: true,
        data: { types }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get device statuses
  async getDeviceStatuses(req, res, next) {
    try {
      const statuses = [
        'online',
        'offline',
        'maintenance',
        'error'
      ];

      res.json({
        success: true,
        data: { statuses }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DeviceController();

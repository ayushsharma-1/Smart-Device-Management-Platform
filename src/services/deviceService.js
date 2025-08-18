const { Device, DeviceLog, User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

class DeviceService {
  async createDevice(deviceData, ownerId) {
    try {
      const device = await Device.create({
        ...deviceData,
        owner_id: ownerId
      });

      logger.info(`New device created: ${device.id} by user ${ownerId}`);

      return {
        success: true,
        device: device.toJSON()
      };
    } catch (error) {
      logger.error('Create device error:', error);
      throw error;
    }
  }

  async getDevices(filters, ownerId, isAdmin = false) {
    try {
      const {
        type,
        status,
        limit,
        offset,
        page,
        sort,
        order
      } = filters;

      // Build where clause
      const where = {};
      
      // Non-admin users can only see their own devices
      if (!isAdmin) {
        where.owner_id = ownerId;
      }

      if (type) where.type = type;
      if (status) where.status = status;

      // Calculate offset from page if provided
      const calculatedOffset = page ? (page - 1) * limit : offset;

      const devices = await Device.findAndCountAll({
        where,
        limit,
        offset: calculatedOffset,
        order: [[sort, order]],
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      return {
        success: true,
        devices: devices.rows,
        pagination: {
          total: devices.count,
          page: page || Math.floor(calculatedOffset / limit) + 1,
          limit,
          totalPages: Math.ceil(devices.count / limit)
        }
      };
    } catch (error) {
      logger.error('Get devices error:', error);
      throw error;
    }
  }

  async getDeviceById(deviceId, ownerId, isAdmin = false) {
    try {
      const where = { id: deviceId };
      
      if (!isAdmin) {
        where.owner_id = ownerId;
      }

      const device = await Device.findOne({
        where,
        include: [
          {
            model: User,
            as: 'owner',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      if (!device) {
        const error = new Error('Device not found');
        error.status = 404;
        throw error;
      }

      return device;
    } catch (error) {
      logger.error('Get device error:', error);
      throw error;
    }
  }

  async updateDevice(deviceId, updateData, ownerId, isAdmin = false) {
    try {
      const device = await this.getDeviceById(deviceId, ownerId, isAdmin);

      await device.update(updateData);

      logger.info(`Device updated: ${deviceId} by user ${ownerId}`);

      return {
        success: true,
        device: device.toJSON()
      };
    } catch (error) {
      logger.error('Update device error:', error);
      throw error;
    }
  }

  async deleteDevice(deviceId, ownerId, isAdmin = false) {
    try {
      const device = await this.getDeviceById(deviceId, ownerId, isAdmin);

      await device.destroy();

      logger.info(`Device deleted: ${deviceId} by user ${ownerId}`);

      return {
        success: true,
        message: 'Device deleted successfully'
      };
    } catch (error) {
      logger.error('Delete device error:', error);
      throw error;
    }
  }

  async recordHeartbeat(deviceId, data, ownerId, isAdmin = false) {
    try {
      const device = await this.getDeviceById(deviceId, ownerId, isAdmin);

      const updateData = {
        last_active_at: new Date()
      };

      if (data.status) {
        updateData.status = data.status;
      }

      if (data.metadata) {
        updateData.metadata = { ...device.metadata, ...data.metadata };
      }

      await device.update(updateData);

      logger.info(`Heartbeat recorded for device: ${deviceId}`);

      return {
        success: true,
        message: 'Device heartbeat recorded',
        last_active_at: device.last_active_at
      };
    } catch (error) {
      logger.error('Record heartbeat error:', error);
      throw error;
    }
  }

  async createDeviceLog(deviceId, logData, ownerId, isAdmin = false) {
    try {
      // Verify device ownership
      await this.getDeviceById(deviceId, ownerId, isAdmin);

      const log = await DeviceLog.create({
        device_id: deviceId,
        ...logData
      });

      logger.info(`Log entry created for device: ${deviceId}`);

      return {
        success: true,
        log: log.toJSON()
      };
    } catch (error) {
      logger.error('Create device log error:', error);
      throw error;
    }
  }

  async getDeviceLogs(deviceId, filters, ownerId, isAdmin = false) {
    try {
      // Verify device ownership
      await this.getDeviceById(deviceId, ownerId, isAdmin);

      const {
        limit,
        offset,
        event,
        start_date,
        end_date
      } = filters;

      const where = { device_id: deviceId };

      if (event) {
        where.event = event;
      }

      if (start_date || end_date) {
        where.timestamp = {};
        if (start_date) where.timestamp[Op.gte] = new Date(start_date);
        if (end_date) where.timestamp[Op.lte] = new Date(end_date);
      }

      const logs = await DeviceLog.findAndCountAll({
        where,
        limit,
        offset,
        order: [['timestamp', 'DESC']]
      });

      return {
        success: true,
        logs: logs.rows
      };
    } catch (error) {
      logger.error('Get device logs error:', error);
      throw error;
    }
  }

  async getDeviceUsage(deviceId, range, ownerId, isAdmin = false) {
    try {
      // Verify device ownership
      await this.getDeviceById(deviceId, ownerId, isAdmin);

      // Calculate time range
      const now = new Date();
      const timeRanges = {
        '1h': 1 * 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '12h': 12 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000
      };

      const startTime = new Date(now.getTime() - timeRanges[range]);

      // Get usage data from logs
      const logs = await DeviceLog.findAll({
        where: {
          device_id: deviceId,
          timestamp: {
            [Op.gte]: startTime
          },
          event: {
            [Op.in]: ['units_consumed', 'energy_used', 'power_consumption']
          }
        },
        order: [['timestamp', 'ASC']]
      });

      // Calculate total usage
      const totalUsage = logs.reduce((sum, log) => {
        return sum + (parseFloat(log.value) || 0);
      }, 0);

      // Get range label
      const rangeLabels = {
        '1h': 'last_1_hour',
        '6h': 'last_6_hours',
        '12h': 'last_12_hours',
        '24h': 'last_24h',
        '7d': 'last_7_days',
        '30d': 'last_30_days'
      };

      return {
        success: true,
        device_id: deviceId,
        [`total_units_${rangeLabels[range]}`]: totalUsage,
        period: {
          start: startTime.toISOString(),
          end: now.toISOString(),
          range
        },
        log_count: logs.length
      };
    } catch (error) {
      logger.error('Get device usage error:', error);
      throw error;
    }
  }

  async getInactiveDevices(hours = 24) {
    try {
      const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));

      const inactiveDevices = await Device.findAll({
        where: {
          status: 'active',
          [Op.or]: [
            { last_active_at: { [Op.lt]: cutoffTime } },
            { last_active_at: null }
          ]
        }
      });

      return inactiveDevices;
    } catch (error) {
      logger.error('Get inactive devices error:', error);
      throw error;
    }
  }

  async deactivateInactiveDevices(hours = 24) {
    try {
      const inactiveDevices = await this.getInactiveDevices(hours);

      if (inactiveDevices.length === 0) {
        return { count: 0, devices: [] };
      }

      const deviceIds = inactiveDevices.map(device => device.id);

      await Device.update(
        { status: 'inactive' },
        {
          where: {
            id: { [Op.in]: deviceIds }
          }
        }
      );

      logger.info(`Deactivated ${inactiveDevices.length} inactive devices`);

      return {
        count: inactiveDevices.length,
        devices: deviceIds
      };
    } catch (error) {
      logger.error('Deactivate inactive devices error:', error);
      throw error;
    }
  }
}

module.exports = new DeviceService();

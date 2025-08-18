const deviceService = require('../services/deviceService');
const logger = require('../utils/logger');

class DeviceController {
  async createDevice(req, res, next) {
    try {
      const result = await deviceService.createDevice(req.body, req.user.id);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getDevices(req, res, next) {
    try {
      const isAdmin = req.user.role === 'admin';
      const result = await deviceService.getDevices(req.query, req.user.id, isAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getDevice(req, res, next) {
    try {
      const isAdmin = req.user.role === 'admin';
      const device = await deviceService.getDeviceById(req.params.id, req.user.id, isAdmin);
      res.json({
        success: true,
        device: device.toJSON()
      });
    } catch (error) {
      next(error);
    }
  }

  async updateDevice(req, res, next) {
    try {
      const isAdmin = req.user.role === 'admin';
      const result = await deviceService.updateDevice(req.params.id, req.body, req.user.id, isAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteDevice(req, res, next) {
    try {
      const isAdmin = req.user.role === 'admin';
      const result = await deviceService.deleteDevice(req.params.id, req.user.id, isAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async recordHeartbeat(req, res, next) {
    try {
      const isAdmin = req.user.role === 'admin';
      const result = await deviceService.recordHeartbeat(req.params.id, req.body, req.user.id, isAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async createDeviceLog(req, res, next) {
    try {
      const isAdmin = req.user.role === 'admin';
      const result = await deviceService.createDeviceLog(req.params.id, req.body, req.user.id, isAdmin);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getDeviceLogs(req, res, next) {
    try {
      const isAdmin = req.user.role === 'admin';
      const result = await deviceService.getDeviceLogs(req.params.id, req.query, req.user.id, isAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getDeviceUsage(req, res, next) {
    try {
      const isAdmin = req.user.role === 'admin';
      const result = await deviceService.getDeviceUsage(req.params.id, req.query.range, req.user.id, isAdmin);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DeviceController();

const { describe, test, expect, beforeEach } = require('@jest/globals');
const deviceService = require('../../src/services/deviceService');
const Device = require('../../src/models/Device');
const DeviceLog = require('../../src/models/DeviceLog');

// Mock the models
jest.mock('../../src/models/Device');
jest.mock('../../src/models/DeviceLog');
jest.mock('../../src/middleware/cache', () => ({
  invalidateCache: {
    device: jest.fn(),
    devices: jest.fn()
  }
}));

describe('DeviceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDevice', () => {
    test('should create a new device successfully', async () => {
      const deviceData = {
        deviceId: 'test-device-001',
        name: 'Test Sensor',
        type: 'sensor',
        organization: 'TestOrg'
      };

      const user = {
        _id: 'user123',
        username: 'testuser',
        organization: 'TestOrg'
      };

      const mockDevice = {
        ...deviceData,
        _id: 'device123',
        save: jest.fn().mockResolvedValue(true),
        populate: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue(deviceData)
      };

      // Mock for Device.findOne - first call returns null (for duplicate check), second returns the device (for logging)
      Device.findOne = jest.fn()
        .mockResolvedValueOnce(null) // For duplicate check
        .mockResolvedValueOnce(mockDevice); // For logDeviceEvent
      Device.mockImplementation(() => mockDevice);
      
      // Mock DeviceLog
      const mockLog = { save: jest.fn().mockResolvedValue(true) };
      DeviceLog.mockImplementation(() => mockLog);

      const result = await deviceService.createDevice(deviceData, user);

      expect(result).toBe(mockDevice);
      expect(mockDevice.save).toHaveBeenCalled();
      expect(mockDevice.populate).toHaveBeenCalledWith('owner', 'username email organization');
    });

    test('should throw error if device ID already exists', async () => {
      const deviceData = {
        deviceId: 'test-device-001',
        name: 'Test Sensor',
        type: 'sensor'
      };

      const user = { _id: 'user123', organization: 'TestOrg' };

      Device.findOne = jest.fn().mockResolvedValue({ deviceId: deviceData.deviceId });

      await expect(deviceService.createDevice(deviceData, user))
        .rejects.toThrow('Device ID already exists');
    });
  });

  describe('getDevices', () => {
    test('should return paginated devices', async () => {
      const filters = { type: 'sensor' };
      const pagination = { page: 1, limit: 10 };
      const user = { role: 'user', _id: 'user123', organization: 'TestOrg' };

      const mockDevices = [
        { deviceId: 'device1', name: 'Device 1', type: 'sensor' },
        { deviceId: 'device2', name: 'Device 2', type: 'sensor' }
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockDevices)
      };

      Device.find = jest.fn().mockReturnValue(mockQuery);
      Device.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await deviceService.getDevices(filters, pagination, user);

      expect(result.devices).toEqual(mockDevices);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pages).toBe(1);
    });

    test('should apply organization filter for non-admin users', async () => {
      const user = { role: 'user', _id: 'user123', organization: 'TestOrg' };

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };

      Device.find = jest.fn().mockReturnValue(mockQuery);
      Device.countDocuments = jest.fn().mockResolvedValue(0);

      await deviceService.getDevices({}, {}, user);

      expect(Device.find).toHaveBeenCalledWith(
        expect.objectContaining({
          organization: 'TestOrg',
          owner: 'user123',
          isActive: true
        })
      );
    });
  });

  describe('updateDevice', () => {
    test('should update device successfully', async () => {
      const deviceId = 'test-device-001';
      const updateData = { name: 'Updated Device Name' };
      const user = { _id: 'user123', role: 'user' };

      const mockDevice = {
        _id: 'device123',
        deviceId,
        owner: { _id: 'user123' },
        save: jest.fn().mockResolvedValue(true)
      };

      // Mock getDeviceById
      jest.spyOn(deviceService, 'getDeviceById').mockResolvedValue(mockDevice);

      const result = await deviceService.updateDevice(deviceId, updateData, user);

      expect(result.name).toBe(updateData.name);
      expect(mockDevice.save).toHaveBeenCalled();
    });

    test('should throw error if user lacks permission', async () => {
      const deviceId = 'test-device-001';
      const updateData = { name: 'Updated Device Name' };
      const user = { _id: 'user123', role: 'user' };

      const mockDevice = {
        _id: 'device123',
        deviceId,
        owner: { _id: 'different-user' }
      };

      jest.spyOn(deviceService, 'getDeviceById').mockResolvedValue(mockDevice);

      await expect(deviceService.updateDevice(deviceId, updateData, user))
        .rejects.toThrow('Access denied');
    });
  });

  describe('updateDeviceStatus', () => {
    test('should update device status successfully', async () => {
      const deviceId = 'test-device-001';
      const newStatus = 'maintenance';
      const user = { _id: 'user123', username: 'testuser' };

      const mockDevice = {
        _id: 'device123',
        deviceId,
        status: 'online',
        updateStatus: jest.fn().mockResolvedValue(true)
      };

      jest.spyOn(deviceService, 'getDeviceById').mockResolvedValue(mockDevice);
      jest.spyOn(deviceService, 'logDeviceEvent').mockResolvedValue(true);

      const result = await deviceService.updateDeviceStatus(deviceId, newStatus, user);

      expect(mockDevice.updateStatus).toHaveBeenCalledWith(newStatus);
      expect(deviceService.logDeviceEvent).toHaveBeenCalledWith(
        deviceId,
        'status_change',
        expect.stringContaining('Status changed from online to maintenance'),
        expect.objectContaining({
          oldStatus: 'online',
          newStatus: 'maintenance',
          changedBy: 'testuser'
        })
      );
    });
  });

  describe('logDeviceEvent', () => {
    test('should log device event successfully', async () => {
      const deviceId = 'test-device-001';
      const eventType = 'heartbeat';
      const message = 'Device heartbeat received';
      const data = { batteryLevel: 85 };

      const mockDevice = { _id: 'device123', deviceId };
      const mockLog = {
        _id: 'log123',
        deviceId,
        eventType,
        message,
        data,
        save: jest.fn().mockResolvedValue(true)
      };

      Device.findOne = jest.fn().mockResolvedValue(mockDevice);
      DeviceLog.mockImplementation(() => mockLog);

      const result = await deviceService.logDeviceEvent(deviceId, eventType, message, data);

      expect(result).toEqual(mockLog);
      expect(mockLog.save).toHaveBeenCalled();
    });

    test('should handle non-existent device gracefully', async () => {
      const deviceId = 'non-existent-device';
      
      Device.findOne = jest.fn().mockResolvedValue(null);
      
      // Should not throw error and return undefined
      const result = await deviceService.logDeviceEvent(deviceId, 'heartbeat', 'test');
      
      expect(result).toBeUndefined();
    });
  });

  describe('getDeviceStats', () => {
    test('should return device statistics', async () => {
      const user = { role: 'admin' };

      const mockStats = [{
        _id: null,
        total: 10,
        online: 6,
        offline: 2,
        maintenance: 1,
        error: 1
      }];

      const mockTypeStats = [
        { _id: 'sensor', count: 5 },
        { _id: 'actuator', count: 3 },
        { _id: 'gateway', count: 2 }
      ];

      Device.aggregate = jest.fn()
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockTypeStats);

      const result = await deviceService.getDeviceStats(user);

      expect(result.overview.total).toBe(10);
      expect(result.overview.online).toBe(6);
      expect(result.byType).toHaveLength(3);
    });
  });
});

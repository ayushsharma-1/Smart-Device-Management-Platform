const deviceService = require('../services/deviceService');
const { sequelize } = require('../database/connection');
const { User, Device } = require('../models');

describe('DeviceService', () => {
  let user;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await Device.destroy({ where: {} });
    await User.destroy({ where: {} });

    user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    });
  });

  describe('deactivateInactiveDevices', () => {
    it('should deactivate devices that have been inactive for more than specified hours', async () => {
      // Create devices with different last_active_at times
      const now = new Date();
      const oldTime = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25 hours ago
      const recentTime = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago

      const inactiveDevice = await Device.create({
        name: 'Inactive Device',
        type: 'light',
        status: 'active',
        owner_id: user.id,
        last_active_at: oldTime
      });

      const activeDevice = await Device.create({
        name: 'Active Device',
        type: 'light',
        status: 'active',
        owner_id: user.id,
        last_active_at: recentTime
      });

      const neverActiveDevice = await Device.create({
        name: 'Never Active Device',
        type: 'light',
        status: 'active',
        owner_id: user.id,
        last_active_at: null
      });

      const result = await deviceService.deactivateInactiveDevices(24);

      expect(result.count).toBe(2); // inactive and never active devices
      expect(result.devices).toContain(inactiveDevice.id);
      expect(result.devices).toContain(neverActiveDevice.id);
      expect(result.devices).not.toContain(activeDevice.id);

      // Verify status changes
      await inactiveDevice.reload();
      await activeDevice.reload();
      await neverActiveDevice.reload();

      expect(inactiveDevice.status).toBe('inactive');
      expect(activeDevice.status).toBe('active');
      expect(neverActiveDevice.status).toBe('inactive');
    });

    it('should return zero count when no inactive devices found', async () => {
      const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago

      await Device.create({
        name: 'Active Device',
        type: 'light',
        status: 'active',
        owner_id: user.id,
        last_active_at: recentTime
      });

      const result = await deviceService.deactivateInactiveDevices(24);

      expect(result.count).toBe(0);
      expect(result.devices).toEqual([]);
    });

    it('should not affect already inactive devices', async () => {
      const oldTime = new Date(Date.now() - 25 * 60 * 60 * 1000);

      const alreadyInactiveDevice = await Device.create({
        name: 'Already Inactive Device',
        type: 'light',
        status: 'inactive',
        owner_id: user.id,
        last_active_at: oldTime
      });

      const result = await deviceService.deactivateInactiveDevices(24);

      expect(result.count).toBe(0);
      expect(result.devices).not.toContain(alreadyInactiveDevice.id);
    });
  });

  describe('getDeviceUsage', () => {
    let device;

    beforeEach(async () => {
      device = await Device.create({
        name: 'Smart Meter',
        type: 'meter',
        status: 'active',
        owner_id: user.id
      });
    });

    it('should calculate usage correctly for different time ranges', async () => {
      const { DeviceLog } = require('../../src/models');
      const now = new Date();

      // Create logs with different timestamps
      await DeviceLog.bulkCreate([
        {
          device_id: device.id,
          event: 'units_consumed',
          value: 2.5,
          timestamp: new Date(now.getTime() - 30 * 60 * 1000) // 30 minutes ago
        },
        {
          device_id: device.id,
          event: 'units_consumed',
          value: 1.2,
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          device_id: device.id,
          event: 'units_consumed',
          value: 0.8,
          timestamp: new Date(now.getTime() - 25 * 60 * 60 * 1000) // 25 hours ago (outside 24h range)
        }
      ]);

      const result = await deviceService.getDeviceUsage(device.id, '24h', user.id);

      expect(result.success).toBe(true);
      expect(result.device_id).toBe(device.id);
      expect(result.total_units_last_24h).toBe(3.7); // 2.5 + 1.2
      expect(result.log_count).toBe(2);
    });
  });
});

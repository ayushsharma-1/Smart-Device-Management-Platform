const request = require('supertest');
const app = require('../app');
const { sequelize } = require('../database/connection');
const { User, Device, DeviceLog } = require('../models');

describe('Device Endpoints', () => {
  let token;
  let user;
  let device;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up
    await DeviceLog.destroy({ where: {} });
    await Device.destroy({ where: {} });
    await User.destroy({ where: {} });

    // Create test user and get token
    user = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123',
      role: 'user'
    });

    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'john@example.com',
        password: 'SecurePass123'
      });

    token = loginResponse.body.token;
  });

  describe('POST /devices', () => {
    it('should create a new device successfully', async () => {
      const deviceData = {
        name: 'Living Room Light',
        type: 'light',
        status: 'active'
      };

      const response = await request(app)
        .post('/devices')
        .set('Authorization', `Bearer ${token}`)
        .send(deviceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.device.name).toBe(deviceData.name);
      expect(response.body.device.type).toBe(deviceData.type);
      expect(response.body.device.owner_id).toBe(user.id);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/devices')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Device name is required');
      expect(response.body.errors).toContain('Device type is required');
    });

    it('should reject invalid device type', async () => {
      const deviceData = {
        name: 'Test Device',
        type: 'invalid-type'
      };

      const response = await request(app)
        .post('/devices')
        .set('Authorization', `Bearer ${token}`)
        .send(deviceData)
        .expect(400);

      expect(response.body.errors).toContain('Device type must be one of: light, sensor, meter, camera, thermostat, switch, other');
    });

    it('should require authentication', async () => {
      const deviceData = {
        name: 'Test Device',
        type: 'light'
      };

      const response = await request(app)
        .post('/devices')
        .send(deviceData)
        .expect(401);

      expect(response.body.message).toBe('Access token required');
    });
  });

  describe('GET /devices', () => {
    beforeEach(async () => {
      // Create test devices
      device = await Device.create({
        name: 'Living Room Light',
        type: 'light',
        status: 'active',
        owner_id: user.id
      });

      await Device.create({
        name: 'Kitchen Sensor',
        type: 'sensor',
        status: 'inactive',
        owner_id: user.id
      });
    });

    it('should return user devices', async () => {
      const response = await request(app)
        .get('/devices')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.devices).toHaveLength(2);
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter devices by type', async () => {
      const response = await request(app)
        .get('/devices?type=light')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.devices).toHaveLength(1);
      expect(response.body.devices[0].type).toBe('light');
    });

    it('should filter devices by status', async () => {
      const response = await request(app)
        .get('/devices?status=active')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.devices).toHaveLength(1);
      expect(response.body.devices[0].status).toBe('active');
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/devices?limit=1&page=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.devices).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
      expect(response.body.pagination.totalPages).toBe(2);
    });
  });

  describe('PATCH /devices/:id', () => {
    beforeEach(async () => {
      device = await Device.create({
        name: 'Living Room Light',
        type: 'light',
        status: 'active',
        owner_id: user.id
      });
    });

    it('should update device successfully', async () => {
      const updateData = {
        name: 'Updated Light',
        status: 'inactive'
      };

      const response = await request(app)
        .patch(`/devices/${device.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.device.name).toBe(updateData.name);
      expect(response.body.device.status).toBe(updateData.status);
    });

    it('should reject update of non-existent device', async () => {
      const response = await request(app)
        .patch('/devices/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body.message).toBe('Device not found');
    });
  });

  describe('DELETE /devices/:id', () => {
    beforeEach(async () => {
      device = await Device.create({
        name: 'Living Room Light',
        type: 'light',
        status: 'active',
        owner_id: user.id
      });
    });

    it('should delete device successfully', async () => {
      const response = await request(app)
        .delete(`/devices/${device.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Device deleted successfully');

      // Verify device is deleted
      const deletedDevice = await Device.findByPk(device.id);
      expect(deletedDevice).toBeNull();
    });
  });

  describe('POST /devices/:id/heartbeat', () => {
    beforeEach(async () => {
      device = await Device.create({
        name: 'Living Room Light',
        type: 'light',
        status: 'active',
        owner_id: user.id
      });
    });

    it('should record heartbeat successfully', async () => {
      const heartbeatData = {
        status: 'active'
      };

      const response = await request(app)
        .post(`/devices/${device.id}/heartbeat`)
        .set('Authorization', `Bearer ${token}`)
        .send(heartbeatData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Device heartbeat recorded');
      expect(response.body.last_active_at).toBeDefined();
    });
  });

  describe('POST /devices/:id/logs', () => {
    beforeEach(async () => {
      device = await Device.create({
        name: 'Smart Meter',
        type: 'meter',
        status: 'active',
        owner_id: user.id
      });
    });

    it('should create device log successfully', async () => {
      const logData = {
        event: 'units_consumed',
        value: 2.5
      };

      const response = await request(app)
        .post(`/devices/${device.id}/logs`)
        .set('Authorization', `Bearer ${token}`)
        .send(logData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.log.event).toBe(logData.event);
      expect(parseFloat(response.body.log.value)).toBe(logData.value);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post(`/devices/${device.id}/logs`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);

      expect(response.body.errors).toContain('Event is required');
    });
  });

  describe('GET /devices/:id/logs', () => {
    beforeEach(async () => {
      device = await Device.create({
        name: 'Smart Meter',
        type: 'meter',
        status: 'active',
        owner_id: user.id
      });

      // Create test logs
      await DeviceLog.bulkCreate([
        {
          device_id: device.id,
          event: 'units_consumed',
          value: 2.5,
          timestamp: new Date('2023-01-01T10:00:00Z')
        },
        {
          device_id: device.id,
          event: 'units_consumed',
          value: 1.2,
          timestamp: new Date('2023-01-01T11:00:00Z')
        }
      ]);
    });

    it('should return device logs', async () => {
      const response = await request(app)
        .get(`/devices/${device.id}/logs`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.logs).toHaveLength(2);
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get(`/devices/${device.id}/logs?limit=1`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.logs).toHaveLength(1);
    });
  });

  describe('GET /devices/:id/usage', () => {
    beforeEach(async () => {
      device = await Device.create({
        name: 'Smart Meter',
        type: 'meter',
        status: 'active',
        owner_id: user.id
      });

      // Create test logs within last 24h
      const now = new Date();
      await DeviceLog.bulkCreate([
        {
          device_id: device.id,
          event: 'units_consumed',
          value: 2.5,
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
        },
        {
          device_id: device.id,
          event: 'units_consumed',
          value: 1.2,
          timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
        }
      ]);
    });

    it('should return usage analytics', async () => {
      const response = await request(app)
        .get(`/devices/${device.id}/usage?range=24h`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.device_id).toBe(device.id);
      expect(response.body.total_units_last_24h).toBe(3.7);
      expect(response.body.period.range).toBe('24h');
    });
  });
});

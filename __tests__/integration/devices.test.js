const request = require('supertest');
const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const server = require('../../src/server');
const database = require('../../src/config/database');
const redisClient = require('../../src/config/redis');

describe('Device API', () => {
  let app;
  let accessToken;
  let testUser;
  let testDevice;

  beforeAll(async () => {
    app = server.getApp();
    await database.clearDatabase();
  });

  afterAll(async () => {
    await database.clearDatabase();
    await database.disconnect();
    await redisClient.disconnect();
  });

  beforeEach(async () => {
    await database.clearDatabase();
    
    // Create test user and login
    testUser = {
      username: 'devicetester',
      email: 'device@example.com',
      password: 'Test123456',
      organization: 'DeviceTestOrg'
    };

    await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    accessToken = loginResponse.body.data.accessToken;

    testDevice = {
      deviceId: 'test-device-001',
      name: 'Test Temperature Sensor',
      type: 'sensor',
      status: 'online',
      location: {
        building: 'Building A',
        floor: '1',
        room: 'Room 101'
      },
      specifications: {
        manufacturer: 'TestCorp',
        model: 'TS-2024'
      }
    };
  });

  describe('POST /api/v1/devices', () => {
    test('should create a new device successfully', async () => {
      const response = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testDevice)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.device.deviceId).toBe(testDevice.deviceId);
      expect(response.body.data.device.name).toBe(testDevice.name);
      expect(response.body.data.device.organization).toBe(testUser.organization);
    });

    test('should fail with invalid device type', async () => {
      const response = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ...testDevice,
          type: 'invalid-type'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    test('should fail with duplicate device ID', async () => {
      // Create first device
      await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testDevice);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testDevice)
        .expect(409);

      expect(response.body.success).toBe(false);
    });

    test('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/devices')
        .send(testDevice)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/devices', () => {
    beforeEach(async () => {
      // Create test devices
      await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testDevice);

      await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ...testDevice,
          deviceId: 'test-device-002',
          name: 'Test Actuator',
          type: 'actuator'
        });
    });

    test('should get all devices', async () => {
      const response = await request(app)
        .get('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.devices).toHaveLength(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    test('should filter devices by type', async () => {
      const response = await request(app)
        .get('/api/v1/devices?type=sensor')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.devices).toHaveLength(1);
      expect(response.body.data.devices[0].type).toBe('sensor');
    });

    test('should search devices by name', async () => {
      const response = await request(app)
        .get('/api/v1/devices?search=Temperature')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.devices).toHaveLength(1);
      expect(response.body.data.devices[0].name).toContain('Temperature');
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/devices?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.devices).toHaveLength(1);
      expect(response.body.data.pagination.pages).toBe(2);
    });
  });

  describe('GET /api/v1/devices/:id', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testDevice);
    });

    test('should get device by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/devices/${testDevice.deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.device.deviceId).toBe(testDevice.deviceId);
    });

    test('should fail with non-existent device ID', async () => {
      const response = await request(app)
        .get('/api/v1/devices/non-existent-device')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/devices/:id', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testDevice);
    });

    test('should update device successfully', async () => {
      const updateData = {
        name: 'Updated Temperature Sensor',
        location: {
          building: 'Building B',
          floor: '2',
          room: 'Room 201'
        }
      };

      const response = await request(app)
        .put(`/api/v1/devices/${testDevice.deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.device.name).toBe(updateData.name);
      expect(response.body.data.device.location.building).toBe(updateData.location.building);
    });

    test('should fail with invalid update data', async () => {
      const response = await request(app)
        .put(`/api/v1/devices/${testDevice.deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: 'invalid-type'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/v1/devices/:id/status', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testDevice);
    });

    test('should update device status', async () => {
      const response = await request(app)
        .patch(`/api/v1/devices/${testDevice.deviceId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'maintenance' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.device.status).toBe('maintenance');
    });

    test('should fail with invalid status', async () => {
      const response = await request(app)
        .patch(`/api/v1/devices/${testDevice.deviceId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/devices/:id/heartbeat', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ ...testDevice, status: 'offline' });
    });

    test('should update device heartbeat', async () => {
      const heartbeatData = {
        timestamp: new Date().toISOString(),
        batteryLevel: 85,
        signalStrength: -45
      };

      const response = await request(app)
        .post(`/api/v1/devices/${testDevice.deviceId}/heartbeat`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(heartbeatData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('online');
    });
  });

  describe('DELETE /api/v1/devices/:id', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/v1/devices')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testDevice);
    });

    test('should delete device successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/devices/${testDevice.deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify device is soft deleted
      const getResponse = await request(app)
        .get(`/api/v1/devices/${testDevice.deviceId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Device Statistics', () => {
    beforeEach(async () => {
      // Create devices with different statuses
      const devices = [
        { ...testDevice, deviceId: 'device-1', status: 'online' },
        { ...testDevice, deviceId: 'device-2', status: 'offline', type: 'actuator' },
        { ...testDevice, deviceId: 'device-3', status: 'maintenance', type: 'gateway' }
      ];

      for (const device of devices) {
        await request(app)
          .post('/api/v1/devices')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(device);
      }
    });

    test('should get device statistics', async () => {
      const response = await request(app)
        .get('/api/v1/devices/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats.overview.total).toBe(3);
      expect(response.body.data.stats.overview.online).toBe(1);
      expect(response.body.data.stats.overview.offline).toBe(1);
      expect(response.body.data.stats.overview.maintenance).toBe(1);
      expect(response.body.data.stats.byType).toHaveLength(3);
    });
  });
});

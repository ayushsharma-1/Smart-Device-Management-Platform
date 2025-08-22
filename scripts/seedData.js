const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../src/models/User');
const Device = require('../src/models/Device');
const DeviceLog = require('../src/models/DeviceLog');

// MongoDB connection options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
};

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smart_devices';
    await mongoose.connect(mongoUri, mongoOptions);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

// Seed data
const seedData = async () => {
  try {
    console.log('🌱 Starting to seed database...');

    // Clear existing data
    await User.deleteMany({});
    await Device.deleteMany({});
    await DeviceLog.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create users
    const hashedPassword = await bcrypt.hash('AdminPass123!', 12);
    
    const users = [
      {
        username: 'admin',
        email: 'admin@curvetech.com',
        password: hashedPassword,
        role: 'admin',
        organization: 'CurveTech',
        isActive: true
      },
      {
        username: 'john_doe',
        email: 'john@techcorp.com',
        password: hashedPassword,
        role: 'user',
        organization: 'TechCorp',
        isActive: true
      },
      {
        username: 'jane_smith',
        email: 'jane@innovate.com',
        password: hashedPassword,
        role: 'user',
        organization: 'InnovateLab',
        isActive: true
      },
      {
        username: 'bob_wilson',
        email: 'bob@techcorp.com',
        password: hashedPassword,
        role: 'user',
        organization: 'TechCorp',
        isActive: true
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`👥 Created ${createdUsers.length} users`);

    // Create devices
    const devices = [
      // TechCorp devices (john_doe and bob_wilson)
      {
        deviceId: 'TEMP_SENSOR_001',
        name: 'Office Temperature Sensor',
        type: 'sensor',
        status: 'online',
        location: 'Building A - Floor 1 - Room 101',
        organization: 'TechCorp',
        owner: createdUsers[1]._id, // john_doe
        metadata: {
          model: 'TempSense Pro v2.1',
          manufacturer: 'SensorTech Industries',
          firmwareVersion: '2.1.4',
          batteryLevel: 85,
          sampleRate: 30,
          range: { min: -40, max: 125, unit: 'celsius' }
        },
        lastHeartbeat: new Date(),
        isActive: true
      },
      {
        deviceId: 'HUMIDITY_SENSOR_001',
        name: 'Warehouse Humidity Monitor',
        type: 'sensor',
        status: 'online',
        location: 'Warehouse - Section B',
        organization: 'TechCorp',
        owner: createdUsers[1]._id, // john_doe
        metadata: {
          model: 'HumidityMax 3000',
          manufacturer: 'EnviroSense',
          firmwareVersion: '1.8.2',
          batteryLevel: 92,
          accuracy: '±2%'
        },
        lastHeartbeat: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        isActive: true
      },
      {
        deviceId: 'ACTUATOR_HVAC_001',
        name: 'HVAC Control Unit',
        type: 'actuator',
        status: 'maintenance',
        location: 'Building A - HVAC Room',
        organization: 'TechCorp',
        owner: createdUsers[3]._id, // bob_wilson
        metadata: {
          model: 'SmartHVAC Controller',
          manufacturer: 'ClimateControl Systems',
          firmwareVersion: '3.2.1',
          powerRating: '5kW',
          controlType: 'PID'
        },
        lastHeartbeat: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
        isActive: true
      },
      {
        deviceId: 'GATEWAY_MAIN_001',
        name: 'Main Building Gateway',
        type: 'gateway',
        status: 'online',
        location: 'Building A - IT Room',
        organization: 'TechCorp',
        owner: createdUsers[3]._id, // bob_wilson
        metadata: {
          model: 'IoTGateway Pro',
          manufacturer: 'ConnectTech',
          firmwareVersion: '4.1.0',
          connectedDevices: 15,
          bandwidth: '1Gbps',
          protocols: ['WiFi', 'Bluetooth', 'LoRaWAN', 'Zigbee']
        },
        lastHeartbeat: new Date(),
        isActive: true
      },
      // InnovateLab devices (jane_smith)
      {
        deviceId: 'PRESSURE_SENSOR_001',
        name: 'Lab Pressure Monitor',
        type: 'sensor',
        status: 'online',
        location: 'Research Lab - Room 204',
        organization: 'InnovateLab',
        owner: createdUsers[2]._id, // jane_smith
        metadata: {
          model: 'PressureMax Industrial',
          manufacturer: 'PrecisionSensors Ltd',
          firmwareVersion: '2.3.1',
          batteryLevel: 78,
          range: { min: 0, max: 1000, unit: 'PSI' }
        },
        lastHeartbeat: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        isActive: true
      },
      {
        deviceId: 'MOTION_SENSOR_001',
        name: 'Security Motion Detector',
        type: 'sensor',
        status: 'offline',
        location: 'Lab Entrance - Main Door',
        organization: 'InnovateLab',
        owner: createdUsers[2]._id, // jane_smith
        metadata: {
          model: 'MotionGuard 500',
          manufacturer: 'SecurityTech',
          firmwareVersion: '1.5.3',
          batteryLevel: 15,
          detectionRange: '8 meters',
          sensitivity: 'high'
        },
        lastHeartbeat: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isActive: true
      },
      {
        deviceId: 'CONTROLLER_LAB_001',
        name: 'Lab Environment Controller',
        type: 'other',
        status: 'error',
        location: 'Research Lab - Control Panel',
        organization: 'InnovateLab',
        owner: createdUsers[2]._id, // jane_smith
        metadata: {
          model: 'LabControl Master',
          manufacturer: 'AutomationSystems',
          firmwareVersion: '3.0.5',
          controlledDevices: 8,
          errorCode: 'ERR_COMM_TIMEOUT',
          lastError: 'Communication timeout with slave device 003'
        },
        lastHeartbeat: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
        isActive: true
      },
      // CurveTech admin devices
      {
        deviceId: 'ADMIN_MONITOR_001',
        name: 'System Monitoring Device',
        type: 'gateway',
        status: 'online',
        location: 'CurveTech - Server Room',
        organization: 'CurveTech',
        owner: createdUsers[0]._id, // admin
        metadata: {
          model: 'SystemMonitor Enterprise',
          manufacturer: 'CurveTech',
          firmwareVersion: '5.0.1',
          monitoredSystems: 25,
          alertsEnabled: true
        },
        lastHeartbeat: new Date(),
        isActive: true
      }
    ];

    const createdDevices = await Device.insertMany(devices);
    console.log(`📱 Created ${createdDevices.length} devices`);

    // Create device logs
    const deviceLogs = [];
    const logTypes = ['heartbeat', 'status_change', 'error', 'data_reading', 'command'];
    
    for (const device of createdDevices) {
      // Create multiple logs for each device
      for (let i = 0; i < 10; i++) {
        const logType = logTypes[Math.floor(Math.random() * logTypes.length)];
        const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Random time in last 7 days
        
        let message, data, severity;
        
        switch (logType) {
          case 'heartbeat':
            message = 'Device heartbeat received';
            severity = 'info';
            data = {
              batteryLevel: Math.floor(Math.random() * 100),
              signalStrength: Math.floor(Math.random() * 100),
              temperature: Math.floor(Math.random() * 50) + 10
            };
            break;
          case 'status_change':
            const statuses = ['online', 'offline', 'maintenance'];
            const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
            message = `Device status changed to ${newStatus}`;
            severity = 'info';
            data = { oldStatus: 'online', newStatus, reason: 'Automated status update' };
            break;
          case 'error':
            message = 'Device error detected';
            severity = ['warning', 'error'][Math.floor(Math.random() * 2)];
            data = {
              errorCode: `ERR_${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
              severity: severity
            };
            break;
          case 'command':
            message = 'Command executed';
            severity = 'info';
            data = {
              command: ['restart', 'calibrate', 'update_config', 'reset'][Math.floor(Math.random() * 4)],
              result: 'success'
            };
            break;
          case 'data_reading':
            message = 'Sensor data reading';
            severity = 'info';
            data = {
              value: Math.random() * 100,
              unit: device.type === 'sensor' ? ['celsius', 'fahrenheit', 'percent', 'psi'][Math.floor(Math.random() * 4)] : 'status',
              quality: 'good'
            };
            break;
        }

        deviceLogs.push({
          deviceId: device.deviceId,
          device: device._id,
          eventType: logType,
          severity,
          message,
          data,
          timestamp
        });
      }
    }

    await DeviceLog.insertMany(deviceLogs);
    console.log(`📋 Created ${deviceLogs.length} device logs`);

    console.log('\n🎉 Database seeded successfully!');
    console.log('\n📊 Seed Data Summary:');
    console.log(`👥 Users: ${createdUsers.length}`);
    console.log(`📱 Devices: ${createdDevices.length}`);
    console.log(`📋 Device Logs: ${deviceLogs.length}`);
    
    console.log('\n🔐 Test Credentials:');
    console.log('Admin User:');
    console.log('  Email: admin@curvetech.com');
    console.log('  Password: AdminPass123!');
    console.log('Regular Users:');
    console.log('  Email: john@techcorp.com | Password: AdminPass123!');
    console.log('  Email: jane@innovate.com | Password: AdminPass123!');
    console.log('  Email: bob@techcorp.com | Password: AdminPass123!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  await connectDB();
  await seedData();
  await mongoose.connection.close();
  console.log('\n✅ Database connection closed');
  process.exit(0);
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { seedData, connectDB };

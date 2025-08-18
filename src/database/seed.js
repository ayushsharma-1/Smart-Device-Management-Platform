const { User, Device, DeviceLog } = require('../models');
const logger = require('../utils/logger');

const seed = async () => {
  try {
    logger.info('Starting database seeding...');
    
    // Create admin user
    const adminUser = await User.findOrCreate({
      where: { email: 'admin@smartdevice.com' },
      defaults: {
        name: 'Admin User',
        email: 'admin@smartdevice.com',
        password: 'Admin123!',
        role: 'admin'
      }
    });

    // Create test user
    const testUser = await User.findOrCreate({
      where: { email: 'john@example.com' },
      defaults: {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123',
        role: 'user'
      }
    });

    // Create sample devices
    const device1 = await Device.findOrCreate({
      where: { name: 'Living Room Light' },
      defaults: {
        name: 'Living Room Light',
        type: 'light',
        status: 'active',
        owner_id: testUser[0].id,
        last_active_at: new Date()
      }
    });

    const device2 = await Device.findOrCreate({
      where: { name: 'Smart Meter' },
      defaults: {
        name: 'Smart Meter',
        type: 'meter',
        status: 'active',
        owner_id: testUser[0].id,
        last_active_at: new Date()
      }
    });

    // Create sample logs
    await DeviceLog.findOrCreate({
      where: { 
        device_id: device2[0].id,
        event: 'units_consumed',
        timestamp: new Date()
      },
      defaults: {
        device_id: device2[0].id,
        event: 'units_consumed',
        value: 2.5,
        timestamp: new Date()
      }
    });

    logger.info('Database seeding completed successfully');
    logger.info('Sample credentials:');
    logger.info('Admin: admin@smartdevice.com / Admin123!');
    logger.info('User: john@example.com / SecurePass123');
    
    process.exit(0);
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seed();
}

module.exports = seed;

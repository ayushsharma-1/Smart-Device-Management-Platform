const { sequelize } = require('./connection');
const logger = require('../utils/logger');
// Import models to ensure they are loaded
require('../models');

const migrate = async () => {
  try {
    logger.info('Starting database migration...');
    
    // Test connection
    await sequelize.authenticate();
    logger.info('Database connection established');
    
    // Sync all models
    await sequelize.sync({ force: false, alter: true });
    logger.info('Database migration completed successfully');
    
    process.exit(0);
  } catch (error) {
    logger.error('Database migration failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  migrate();
}

module.exports = migrate;

const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const Device = sequelize.define('Device', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => `d${Date.now()}${Math.floor(Math.random() * 1000)}`
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      isIn: [['light', 'sensor', 'meter', 'camera', 'thermostat', 'switch', 'other']]
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
    defaultValue: 'active',
    allowNull: false
  },
  last_active_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  owner_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    allowNull: true
  }
}, {
  tableName: 'devices',
  indexes: [
    {
      fields: ['owner_id']
    },
    {
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['last_active_at']
    }
  ]
});

module.exports = Device;

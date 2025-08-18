const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const DeviceLog = sequelize.define('DeviceLog', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    defaultValue: () => `l${Date.now()}${Math.floor(Math.random() * 1000)}`
  },
  device_id: {
    type: DataTypes.STRING(50),
    allowNull: false,
    references: {
      model: 'devices',
      key: 'id'
    }
  },
  event: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  value: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {},
    allowNull: true
  }
}, {
  tableName: 'device_logs',
  indexes: [
    {
      fields: ['device_id']
    },
    {
      fields: ['timestamp']
    },
    {
      fields: ['event']
    },
    {
      fields: ['device_id', 'timestamp']
    }
  ]
});

module.exports = DeviceLog;

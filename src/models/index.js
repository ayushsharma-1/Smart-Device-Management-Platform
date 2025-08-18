const User = require('./User');
const Device = require('./Device');
const DeviceLog = require('./DeviceLog');

// Define associations
User.hasMany(Device, {
  foreignKey: 'owner_id',
  as: 'devices',
  onDelete: 'CASCADE'
});

Device.belongsTo(User, {
  foreignKey: 'owner_id',
  as: 'owner'
});

Device.hasMany(DeviceLog, {
  foreignKey: 'device_id',
  as: 'logs',
  onDelete: 'CASCADE'
});

DeviceLog.belongsTo(Device, {
  foreignKey: 'device_id',
  as: 'device'
});

module.exports = {
  User,
  Device,
  DeviceLog
};

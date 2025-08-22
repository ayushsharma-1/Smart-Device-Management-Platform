const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    required: true,
    enum: ['sensor', 'actuator', 'gateway', 'camera', 'thermostat', 'light', 'lock', 'other'],
    default: 'sensor'
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'maintenance', 'error'],
    default: 'offline'
  },
  location: {
    building: String,
    floor: String,
    room: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organization: {
    type: String,
    required: true,
    trim: true
  },
  specifications: {
    manufacturer: String,
    model: String,
    serialNumber: String,
    firmwareVersion: String,
    hardwareVersion: String,
    powerSource: {
      type: String,
      enum: ['battery', 'mains', 'solar', 'other'],
      default: 'mains'
    },
    communicationProtocol: {
      type: String,
      enum: ['wifi', 'bluetooth', 'zigbee', 'lora', 'cellular', 'ethernet'],
      default: 'wifi'
    }
  },
  configuration: {
    settings: mongoose.Schema.Types.Mixed,
    thresholds: mongoose.Schema.Types.Mixed,
    schedules: mongoose.Schema.Types.Mixed
  },
  connectivity: {
    ipAddress: String,
    macAddress: String,
    signalStrength: Number,
    lastSeen: {
      type: Date,
      default: Date.now
    },
    heartbeatInterval: {
      type: Number,
      default: 300 // 5 minutes in seconds
    }
  },
  health: {
    batteryLevel: Number,
    temperature: Number,
    uptime: Number,
    errorCount: {
      type: Number,
      default: 0
    },
    lastMaintenance: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tags: [String],
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
deviceSchema.index({ deviceId: 1 }, { unique: true });
deviceSchema.index({ owner: 1 });
deviceSchema.index({ organization: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ type: 1 });
deviceSchema.index({ isActive: 1 });
deviceSchema.index({ 'connectivity.lastSeen': 1 });
deviceSchema.index({ createdAt: 1 });
deviceSchema.index({ updatedAt: 1 });

// Compound indexes for common queries
deviceSchema.index({ organization: 1, status: 1 });
deviceSchema.index({ organization: 1, type: 1 });
deviceSchema.index({ owner: 1, status: 1 });

// Virtual for device age
deviceSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Virtual for online status based on last seen
deviceSchema.virtual('isOnline').get(function() {
  if (!this.connectivity.lastSeen) return false;
  const threshold = this.connectivity.heartbeatInterval * 2 * 1000; // 2x heartbeat interval in ms
  return (Date.now() - this.connectivity.lastSeen.getTime()) < threshold;
});

// Update last seen timestamp
deviceSchema.methods.updateHeartbeat = function() {
  this.connectivity.lastSeen = new Date();
  if (this.status === 'offline') {
    this.status = 'online';
  }
  return this.save();
};

// Update device status
deviceSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  if (newStatus === 'online') {
    this.connectivity.lastSeen = new Date();
  }
  return this.save();
};

// Add error count
deviceSchema.methods.incrementErrorCount = function() {
  this.health.errorCount += 1;
  return this.save();
};

// Reset error count
deviceSchema.methods.resetErrorCount = function() {
  this.health.errorCount = 0;
  return this.save();
};

module.exports = mongoose.model('Device', deviceSchema);

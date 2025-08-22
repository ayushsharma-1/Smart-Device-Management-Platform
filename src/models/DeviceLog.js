const mongoose = require('mongoose');

const deviceLogSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    enum: ['heartbeat', 'status_change', 'data_reading', 'error', 'command', 'configuration_change'],
    index: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    source: String,
    version: String,
    sessionId: String,
    correlationId: String
  }
}, {
  timestamps: true
});

// Indexes for performance optimization
deviceLogSchema.index({ deviceId: 1, timestamp: -1 });
deviceLogSchema.index({ device: 1, timestamp: -1 });
deviceLogSchema.index({ eventType: 1, timestamp: -1 });
deviceLogSchema.index({ severity: 1, timestamp: -1 });
deviceLogSchema.index({ timestamp: -1 }); // For general time-based queries

// TTL index to automatically delete old logs (optional - keep 90 days)
deviceLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('DeviceLog', deviceLogSchema);

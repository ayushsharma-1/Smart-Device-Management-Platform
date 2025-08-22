const mongoose = require('mongoose');

const exportJobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['device_logs', 'usage_report', 'device_list'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  parameters: {
    deviceIds: [String],
    startDate: Date,
    endDate: Date,
    format: {
      type: String,
      enum: ['csv', 'json'],
      default: 'csv'
    },
    filters: mongoose.Schema.Types.Mixed
  },
  result: {
    fileName: String,
    filePath: String,
    fileSize: Number,
    recordCount: Number,
    downloadUrl: String
  },
  error: {
    message: String,
    stack: String
  },
  progress: {
    percentage: {
      type: Number,
      default: 0
    },
    currentStep: String,
    totalSteps: Number
  },
  estimatedCompletionTime: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }
}, {
  timestamps: true
});

// Indexes
exportJobSchema.index({ jobId: 1 }, { unique: true });
exportJobSchema.index({ userId: 1 });
exportJobSchema.index({ status: 1 });
exportJobSchema.index({ createdAt: -1 });
exportJobSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model('ExportJob', exportJobSchema);

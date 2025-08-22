const fs = require('fs').promises;
const path = require('path');
const csvWriter = require('csv-writer');
const { v4: uuidv4 } = require('uuid');
const ExportJob = require('../models/ExportJob');
const Device = require('../models/Device');
const DeviceLog = require('../models/DeviceLog');
const User = require('../models/User');
const { AppError } = require('../middleware/errorHandler');

class ExportService {
  constructor() {
    this.exportDir = path.join(process.cwd(), 'uploads', 'exports');
    this.ensureExportDirectory();
  }

  // Ensure export directory exists
  async ensureExportDirectory() {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch (error) {
      console.error('Error creating export directory:', error);
    }
  }

  // Create export job
  async createExportJob(type, parameters, userId) {
    try {
      const jobId = uuidv4();
      
      const job = new ExportJob({
        jobId,
        userId,
        type,
        parameters,
        status: 'pending'
      });

      await job.save();

      // Start processing asynchronously
      this.processExportJob(jobId).catch(error => {
        console.error(`Export job ${jobId} failed:`, error);
        this.updateJobStatus(jobId, 'failed', { 
          message: error.message,
          stack: error.stack
        });
      });

      return job;
    } catch (error) {
      throw error;
    }
  }

  // Process export job
  async processExportJob(jobId) {
    try {
      const job = await ExportJob.findOne({ jobId }).populate('userId');
      if (!job) {
        throw new Error('Job not found');
      }

      await this.updateJobStatus(jobId, 'processing', null, { currentStep: 'Preparing data', percentage: 10 });

      let result;
      switch (job.type) {
        case 'device_logs':
          result = await this.exportDeviceLogs(job);
          break;
        case 'usage_report':
          result = await this.exportUsageReport(job);
          break;
        case 'device_list':
          result = await this.exportDeviceList(job);
          break;
        default:
          throw new Error('Invalid export type');
      }

      await this.updateJobStatus(jobId, 'completed', null, { currentStep: 'Completed', percentage: 100 }, result);

      // Send notification (simulate email)
      await this.sendExportNotification(job, result);

    } catch (error) {
      await this.updateJobStatus(jobId, 'failed', {
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Export device logs
  async exportDeviceLogs(job) {
    const { deviceIds, startDate, endDate, format } = job.parameters;
    const user = job.userId;

    // Build query
    let query = {};

    // Device filter
    if (deviceIds && deviceIds.length > 0) {
      query.deviceId = { $in: deviceIds };
    }

    // Date filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // Apply organization/user filters
    const deviceQuery = await this.buildDeviceQuery(user);
    const allowedDevices = await Device.find(deviceQuery).select('deviceId');
    const allowedDeviceIds = allowedDevices.map(d => d.deviceId);

    if (query.deviceId) {
      query.deviceId.$in = query.deviceId.$in.filter(id => allowedDeviceIds.includes(id));
    } else {
      query.deviceId = { $in: allowedDeviceIds };
    }

    await this.updateJobProgress(job.jobId, 30, 'Fetching logs');

    // Get logs
    const logs = await DeviceLog.find(query)
      .populate('device', 'name type organization')
      .sort({ timestamp: -1 })
      .lean();

    await this.updateJobProgress(job.jobId, 70, 'Formatting data');

    // Generate file
    const fileName = `device_logs_${Date.now()}.${format}`;
    const filePath = path.join(this.exportDir, fileName);

    if (format === 'csv') {
      await this.generateCSV(logs, filePath, this.getLogCSVHeaders());
    } else {
      await this.generateJSON(logs, filePath);
    }

    const stats = await fs.stat(filePath);

    await this.updateJobProgress(job.jobId, 90, 'Finalizing export');

    return {
      fileName,
      filePath,
      fileSize: stats.size,
      recordCount: logs.length,
      downloadUrl: `/api/v1/exports/download/${job.jobId}`
    };
  }

  // Export usage report
  async exportUsageReport(job) {
    const { startDate, endDate, format } = job.parameters;
    const user = job.userId;

    // Build device query
    const deviceQuery = await this.buildDeviceQuery(user);
    const devices = await Device.find(deviceQuery).lean();

    await this.updateJobProgress(job.jobId, 30, 'Analyzing usage data');

    // Generate usage statistics
    const usageData = [];
    for (const device of devices) {
      const logQuery = {
        device: device._id,
        timestamp: {}
      };

      if (startDate) {
        logQuery.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        logQuery.timestamp.$lte = new Date(endDate);
      }

      const [totalEvents, errorEvents, heartbeats, lastActivity] = await Promise.all([
        DeviceLog.countDocuments(logQuery),
        DeviceLog.countDocuments({ ...logQuery, severity: { $in: ['error', 'critical'] } }),
        DeviceLog.countDocuments({ ...logQuery, eventType: 'heartbeat' }),
        DeviceLog.findOne({ device: device._id }).sort({ timestamp: -1 }).select('timestamp')
      ]);

      usageData.push({
        deviceId: device.deviceId,
        deviceName: device.name,
        deviceType: device.type,
        organization: device.organization,
        status: device.status,
        totalEvents,
        errorEvents,
        heartbeats,
        lastActivity: lastActivity?.timestamp,
        uptime: this.calculateUptime(heartbeats, startDate, endDate),
        errorRate: totalEvents > 0 ? ((errorEvents / totalEvents) * 100).toFixed(2) : 0
      });
    }

    await this.updateJobProgress(job.jobId, 70, 'Generating report');

    // Generate file
    const fileName = `usage_report_${Date.now()}.${format}`;
    const filePath = path.join(this.exportDir, fileName);

    if (format === 'csv') {
      await this.generateCSV(usageData, filePath, this.getUsageReportCSVHeaders());
    } else {
      await this.generateJSON(usageData, filePath);
    }

    const stats = await fs.stat(filePath);

    return {
      fileName,
      filePath,
      fileSize: stats.size,
      recordCount: usageData.length,
      downloadUrl: `/api/v1/exports/download/${job.jobId}`
    };
  }

  // Export device list
  async exportDeviceList(job) {
    const { format } = job.parameters;
    const user = job.userId;

    // Build device query
    const deviceQuery = await this.buildDeviceQuery(user);
    
    await this.updateJobProgress(job.jobId, 50, 'Fetching device data');

    const devices = await Device.find(deviceQuery)
      .populate('owner', 'username email')
      .lean();

    // Format device data
    const deviceData = devices.map(device => ({
      deviceId: device.deviceId,
      name: device.name,
      type: device.type,
      status: device.status,
      organization: device.organization,
      owner: device.owner ? device.owner.username : 'N/A',
      ownerEmail: device.owner ? device.owner.email : 'N/A',
      manufacturer: device.specifications?.manufacturer || 'N/A',
      model: device.specifications?.model || 'N/A',
      location: `${device.location?.building || ''} - ${device.location?.room || ''}`.trim(),
      lastSeen: device.connectivity?.lastSeen,
      batteryLevel: device.health?.batteryLevel,
      errorCount: device.health?.errorCount || 0,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt
    }));

    await this.updateJobProgress(job.jobId, 80, 'Generating file');

    // Generate file
    const fileName = `device_list_${Date.now()}.${format}`;
    const filePath = path.join(this.exportDir, fileName);

    if (format === 'csv') {
      await this.generateCSV(deviceData, filePath, this.getDeviceListCSVHeaders());
    } else {
      await this.generateJSON(deviceData, filePath);
    }

    const stats = await fs.stat(filePath);

    return {
      fileName,
      filePath,
      fileSize: stats.size,
      recordCount: deviceData.length,
      downloadUrl: `/api/v1/exports/download/${job.jobId}`
    };
  }

  // Generate CSV file
  async generateCSV(data, filePath, headers) {
    const writer = csvWriter.createObjectCsvWriter({
      path: filePath,
      header: headers
    });

    await writer.writeRecords(data);
  }

  // Generate JSON file
  async generateJSON(data, filePath) {
    const jsonData = JSON.stringify(data, null, 2);
    await fs.writeFile(filePath, jsonData, 'utf8');
  }

  // Build device query based on user permissions
  async buildDeviceQuery(user) {
    let query = { isActive: true };

    if (user.role !== 'admin') {
      query.organization = user.organization;
    }

    if (user.role === 'user') {
      query.owner = user._id;
    }

    return query;
  }

  // Update job status
  async updateJobStatus(jobId, status, error = null, progress = null, result = null) {
    const update = { status };

    if (error) {
      update.error = error;
    }

    if (progress) {
      update.progress = progress;
    }

    if (result) {
      update.result = result;
    }

    await ExportJob.findOneAndUpdate({ jobId }, update);
  }

  // Update job progress
  async updateJobProgress(jobId, percentage, currentStep) {
    await ExportJob.findOneAndUpdate(
      { jobId },
      {
        'progress.percentage': percentage,
        'progress.currentStep': currentStep
      }
    );
  }

  // Calculate uptime percentage
  calculateUptime(heartbeats, startDate, endDate) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const totalMinutes = (end - start) / (1000 * 60);
    const expectedHeartbeats = totalMinutes / 5; // Assuming 5-minute intervals
    
    return expectedHeartbeats > 0 ? Math.min(100, (heartbeats / expectedHeartbeats) * 100).toFixed(2) : 0;
  }

  // Send export notification
  async sendExportNotification(job, result) {
    // Simulate email notification
    console.log(`📧 Export notification sent to ${job.userId.email}:`);
    console.log(`   Job: ${job.type}`);
    console.log(`   Status: ${job.status}`);
    console.log(`   File: ${result.fileName}`);
    console.log(`   Records: ${result.recordCount}`);
    console.log(`   Download: ${result.downloadUrl}`);
  }

  // Get job status
  async getJobStatus(jobId, userId) {
    const job = await ExportJob.findOne({ jobId, userId });
    if (!job) {
      throw new AppError('Export job not found', 404, 'JOB_NOT_FOUND');
    }

    return job;
  }

  // Get user jobs
  async getUserJobs(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      ExportJob.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ExportJob.countDocuments({ userId })
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Download file
  async downloadFile(jobId, userId) {
    const job = await ExportJob.findOne({ jobId, userId });
    if (!job) {
      throw new AppError('Export job not found', 404, 'JOB_NOT_FOUND');
    }

    if (job.status !== 'completed') {
      throw new AppError('Export job not completed', 400, 'JOB_NOT_COMPLETED');
    }

    if (!job.result.filePath) {
      throw new AppError('Export file not found', 404, 'FILE_NOT_FOUND');
    }

    try {
      await fs.access(job.result.filePath);
      return {
        filePath: job.result.filePath,
        fileName: job.result.fileName,
        fileSize: job.result.fileSize
      };
    } catch (error) {
      throw new AppError('Export file not found', 404, 'FILE_NOT_FOUND');
    }
  }

  // CSV Headers
  getLogCSVHeaders() {
    return [
      { id: 'deviceId', title: 'Device ID' },
      { id: 'device.name', title: 'Device Name' },
      { id: 'device.type', title: 'Device Type' },
      { id: 'eventType', title: 'Event Type' },
      { id: 'severity', title: 'Severity' },
      { id: 'message', title: 'Message' },
      { id: 'timestamp', title: 'Timestamp' },
      { id: 'device.organization', title: 'Organization' }
    ];
  }

  getUsageReportCSVHeaders() {
    return [
      { id: 'deviceId', title: 'Device ID' },
      { id: 'deviceName', title: 'Device Name' },
      { id: 'deviceType', title: 'Device Type' },
      { id: 'organization', title: 'Organization' },
      { id: 'status', title: 'Status' },
      { id: 'totalEvents', title: 'Total Events' },
      { id: 'errorEvents', title: 'Error Events' },
      { id: 'heartbeats', title: 'Heartbeats' },
      { id: 'uptime', title: 'Uptime %' },
      { id: 'errorRate', title: 'Error Rate %' },
      { id: 'lastActivity', title: 'Last Activity' }
    ];
  }

  getDeviceListCSVHeaders() {
    return [
      { id: 'deviceId', title: 'Device ID' },
      { id: 'name', title: 'Name' },
      { id: 'type', title: 'Type' },
      { id: 'status', title: 'Status' },
      { id: 'organization', title: 'Organization' },
      { id: 'owner', title: 'Owner' },
      { id: 'ownerEmail', title: 'Owner Email' },
      { id: 'manufacturer', title: 'Manufacturer' },
      { id: 'model', title: 'Model' },
      { id: 'location', title: 'Location' },
      { id: 'lastSeen', title: 'Last Seen' },
      { id: 'batteryLevel', title: 'Battery Level' },
      { id: 'errorCount', title: 'Error Count' },
      { id: 'createdAt', title: 'Created At' }
    ];
  }
}

module.exports = new ExportService();

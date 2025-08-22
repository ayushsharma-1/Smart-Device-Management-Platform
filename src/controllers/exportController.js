const exportService = require('../services/exportService');
const path = require('path');
const fs = require('fs');

class ExportController {
  // Create new export job
  async createExport(req, res, next) {
    try {
      const { type, parameters } = req.body;

      // Validate export type
      const validTypes = ['device_logs', 'usage_report', 'device_list'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid export type',
          validTypes
        });
      }

      // Create export job
      const job = await exportService.createExportJob(type, parameters, req.user._id);

      res.status(202).json({
        success: true,
        message: 'Export job created successfully',
        data: {
          jobId: job.jobId,
          type: job.type,
          status: job.status,
          parameters: job.parameters,
          createdAt: job.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get export job status
  async getExportStatus(req, res, next) {
    try {
      const { jobId } = req.params;
      const job = await exportService.getJobStatus(jobId, req.user._id);

      res.json({
        success: true,
        data: { job }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user's export jobs
  async getUserExports(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await exportService.getUserJobs(req.user._id, page, limit);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  // Download export file
  async downloadExport(req, res, next) {
    try {
      const { jobId } = req.params;
      const fileInfo = await exportService.downloadFile(jobId, req.user._id);

      // Check if file exists
      if (!fs.existsSync(fileInfo.filePath)) {
        return res.status(404).json({
          success: false,
          message: 'Export file not found'
        });
      }

      // Set headers for file download
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', fileInfo.fileSize);

      // Stream the file
      const fileStream = fs.createReadStream(fileInfo.filePath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('File stream error:', error);
        res.status(500).json({
          success: false,
          message: 'Error streaming file'
        });
      });

    } catch (error) {
      next(error);
    }
  }

  // Cancel export job
  async cancelExport(req, res, next) {
    try {
      const { jobId } = req.params;
      
      // Update job status to cancelled
      await exportService.updateJobStatus(jobId, 'cancelled', {
        message: 'Job cancelled by user',
        cancelledBy: req.user.username
      });

      res.json({
        success: true,
        message: 'Export job cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete export job and file
  async deleteExport(req, res, next) {
    try {
      const { jobId } = req.params;
      const job = await exportService.getJobStatus(jobId, req.user._id);

      // Delete file if it exists
      if (job.result && job.result.filePath && fs.existsSync(job.result.filePath)) {
        fs.unlinkSync(job.result.filePath);
      }

      // Delete job from database
      await ExportJob.findOneAndDelete({ jobId, userId: req.user._id });

      res.json({
        success: true,
        message: 'Export job deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get export statistics
  async getExportStats(req, res, next) {
    try {
      const ExportJob = require('../models/ExportJob');

      const stats = await ExportJob.aggregate([
        { $match: { userId: req.user._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            failed: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            pending: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            processing: {
              $sum: { $cond: [{ $eq: ['$status', 'processing'] }, 1, 0] }
            }
          }
        }
      ]);

      const typeStats = await ExportJob.aggregate([
        { $match: { userId: req.user._id } },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);

      const result = {
        overview: stats[0] || { total: 0, completed: 0, failed: 0, pending: 0, processing: 0 },
        byType: typeStats
      };

      res.json({
        success: true,
        data: { stats: result }
      });
    } catch (error) {
      next(error);
    }
  }

  // Get supported export formats
  async getExportFormats(req, res, next) {
    try {
      const formats = {
        device_logs: ['csv', 'json'],
        usage_report: ['csv', 'json'],
        device_list: ['csv', 'json']
      };

      res.json({
        success: true,
        data: { formats }
      });
    } catch (error) {
      next(error);
    }
  }

  // Bulk export (for admin users)
  async bulkExport(req, res, next) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required for bulk exports'
        });
      }

      const { exports } = req.body; // Array of export requests

      const jobs = [];
      for (const exportRequest of exports) {
        try {
          const job = await exportService.createExportJob(
            exportRequest.type,
            exportRequest.parameters,
            req.user._id
          );
          jobs.push({ success: true, jobId: job.jobId, type: job.type });
        } catch (error) {
          jobs.push({ success: false, error: error.message, type: exportRequest.type });
        }
      }

      res.status(202).json({
        success: true,
        message: 'Bulk export jobs created',
        data: { jobs }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExportController();

const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const BlacklistedToken = require('../models/BlacklistedToken');
const config = require('../config/config');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> [socketIds]
    this.userSockets = new Map(); // socketId -> userData
  }

  // Initialize WebSocket server
  initialize(server) {
    this.io = socketIo(server, {
      cors: {
        origin: config.cors.origin,
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Check if token is blacklisted
        const blacklistedToken = await BlacklistedToken.findOne({ token });
        if (blacklistedToken) {
          return next(new Error('Token has been revoked'));
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwt.accessSecret);
        
        // Get user
        const user = await User.findById(decoded.userId).select('-password -refreshTokens');
        if (!user || !user.isActive) {
          return next(new Error('User not found or inactive'));
        }

        socket.user = user;
        socket.token = token;
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });

    // Connection handling
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log('🔌 WebSocket server initialized');
  }

  // Handle new connection
  handleConnection(socket) {
    const user = socket.user;
    console.log(`👤 User ${user.username} connected via WebSocket (${socket.id})`);

    // Add to connected users
    if (!this.connectedUsers.has(user._id.toString())) {
      this.connectedUsers.set(user._id.toString(), []);
    }
    this.connectedUsers.get(user._id.toString()).push(socket.id);
    this.userSockets.set(socket.id, { userId: user._id.toString(), organization: user.organization, role: user.role });

    // Join organization room
    socket.join(`org_${user.organization}`);

    // Join user-specific room
    socket.join(`user_${user._id}`);

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to real-time updates',
      userId: user._id,
      timestamp: new Date()
    });

    // Handle device subscription
    socket.on('subscribe:devices', (data) => {
      this.handleDeviceSubscription(socket, data);
    });

    // Handle device status updates
    socket.on('device:status', (data) => {
      this.handleDeviceStatusUpdate(socket, data);
    });

    // Handle heartbeat
    socket.on('heartbeat', () => {
      socket.emit('heartbeat_ack', { timestamp: new Date() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`WebSocket error for user ${user.username}:`, error);
    });
  }

  // Handle device subscription
  handleDeviceSubscription(socket, data) {
    const { deviceIds = [] } = data;
    const user = socket.user;

    // Join device-specific rooms
    deviceIds.forEach(deviceId => {
      // Only allow subscription to devices in same organization
      socket.join(`device_${deviceId}_${user.organization}`);
    });

    socket.emit('subscription:success', {
      message: 'Subscribed to device updates',
      deviceIds,
      timestamp: new Date()
    });

    console.log(`📱 User ${user.username} subscribed to ${deviceIds.length} devices`);
  }

  // Handle device status updates
  handleDeviceStatusUpdate(socket, data) {
    const { deviceId, status, message } = data;
    const user = socket.user;

    // Broadcast to organization members
    this.broadcastToOrganization(user.organization, 'device:status_update', {
      deviceId,
      status,
      message,
      updatedBy: user.username,
      timestamp: new Date()
    });

    console.log(`📊 Device ${deviceId} status updated to ${status} by ${user.username}`);
  }

  // Handle disconnection
  handleDisconnection(socket, reason) {
    const userData = this.userSockets.get(socket.id);
    
    if (userData) {
      const userId = userData.userId;
      console.log(`👤 User disconnected (${socket.id}): ${reason}`);

      // Remove from connected users
      if (this.connectedUsers.has(userId)) {
        const sockets = this.connectedUsers.get(userId);
        const index = sockets.indexOf(socket.id);
        if (index > -1) {
          sockets.splice(index, 1);
        }
        
        // Remove user entry if no more sockets
        if (sockets.length === 0) {
          this.connectedUsers.delete(userId);
        }
      }

      this.userSockets.delete(socket.id);
    }
  }

  // Broadcast device heartbeat
  broadcastDeviceHeartbeat(deviceId, organization, data) {
    if (!this.io) return;

    const payload = {
      deviceId,
      status: 'online',
      ...data,
      timestamp: new Date()
    };

    // Broadcast to organization members
    this.io.to(`org_${organization}`).emit('device:heartbeat', payload);

    // Broadcast to device-specific subscribers
    this.io.to(`device_${deviceId}_${organization}`).emit('device:heartbeat', payload);
  }

  // Broadcast device status change
  broadcastDeviceStatusChange(deviceId, organization, oldStatus, newStatus, data = {}) {
    if (!this.io) return;

    const payload = {
      deviceId,
      oldStatus,
      newStatus,
      ...data,
      timestamp: new Date()
    };

    // Broadcast to organization members
    this.io.to(`org_${organization}`).emit('device:status_change', payload);

    // Broadcast to device-specific subscribers
    this.io.to(`device_${deviceId}_${organization}`).emit('device:status_change', payload);

    console.log(`📊 Broadcasted status change for device ${deviceId}: ${oldStatus} -> ${newStatus}`);
  }

  // Broadcast device error
  broadcastDeviceError(deviceId, organization, error) {
    if (!this.io) return;

    const payload = {
      deviceId,
      error: error.message || error,
      severity: error.severity || 'error',
      timestamp: new Date()
    };

    // Broadcast to organization members
    this.io.to(`org_${organization}`).emit('device:error', payload);

    // Broadcast to device-specific subscribers
    this.io.to(`device_${deviceId}_${organization}`).emit('device:error', payload);

    console.log(`❌ Broadcasted error for device ${deviceId}: ${error.message || error}`);
  }

  // Broadcast to organization
  broadcastToOrganization(organization, event, data) {
    if (!this.io) return;

    this.io.to(`org_${organization}`).emit(event, data);
  }

  // Broadcast to specific user
  broadcastToUser(userId, event, data) {
    if (!this.io) return;

    this.io.to(`user_${userId}`).emit(event, data);
  }

  // Broadcast system notification
  broadcastSystemNotification(message, severity = 'info', targetOrganization = null) {
    if (!this.io) return;

    const payload = {
      message,
      severity,
      timestamp: new Date()
    };

    if (targetOrganization) {
      this.io.to(`org_${targetOrganization}`).emit('system:notification', payload);
    } else {
      this.io.emit('system:notification', payload);
    }

    console.log(`📢 System notification broadcasted: ${message}`);
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected users for organization
  getOrganizationUsersCount(organization) {
    let count = 0;
    for (const [socketId, userData] of this.userSockets) {
      if (userData.organization === organization) {
        count++;
      }
    }
    return count;
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.connectedUsers.has(userId.toString());
  }

  // Get connection stats
  getConnectionStats() {
    const stats = {
      totalConnections: this.userSockets.size,
      uniqueUsers: this.connectedUsers.size,
      organizationBreakdown: {}
    };

    // Count by organization
    for (const [socketId, userData] of this.userSockets) {
      const org = userData.organization;
      stats.organizationBreakdown[org] = (stats.organizationBreakdown[org] || 0) + 1;
    }

    return stats;
  }

  // Disconnect user
  disconnectUser(userId, reason = 'Server disconnect') {
    if (!this.io) return;

    const socketIds = this.connectedUsers.get(userId.toString()) || [];
    socketIds.forEach(socketId => {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('server:disconnect', { reason });
        socket.disconnect(true);
      }
    });
  }

  // Cleanup method
  cleanup() {
    if (this.io) {
      this.io.close();
      this.connectedUsers.clear();
      this.userSockets.clear();
      console.log('🔌 WebSocket server cleaned up');
    }
  }
}

module.exports = new WebSocketService();

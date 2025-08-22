const express = require('express');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');

// Import configurations
const config = require('./config/config');
const database = require('./config/database');
const redisClient = require('./config/redis');

// Import middleware
const { performanceMonitor, logFormats } = require('./middleware/logging');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const rateLimiters = require('./middleware/rateLimiter');

// Import routes
const routes = require('./routes');

// Import services
const websocketService = require('./services/websocketService');

class Server {
  constructor() {
    this.app = express();
    this.server = null;
  }

  // Initialize middleware
  initializeMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Cache', 'X-Response-Time']
    }));

    // Compression
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(cookieParser());

    // Performance monitoring
    this.app.use(performanceMonitor);

    // Request logging
    const logFormat = config.nodeEnv === 'production' ? logFormats.production : logFormats.development;
    this.app.use(logFormat);

    // Rate limiting
    this.app.use('/api', rateLimiters.general);

    console.log('✅ Middleware initialized');
  }

  // Initialize routes
  initializeRoutes() {
    // Health check route (before API routes)
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    });

    // API routes
    this.app.use(`/api/${config.api.version}`, routes);

    // Serve static files (for exports)
    this.app.use('/uploads', express.static('uploads'));

    // 404 handler
    this.app.use(notFound);

    // Error handler
    this.app.use(errorHandler);

    console.log('✅ Routes initialized');
  }

  // Initialize database connections
  async initializeDatabase() {
    try {
      await database.connect();
      await redisClient.connect();
      console.log('✅ Database connections established');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  // Initialize WebSocket
  initializeWebSocket() {
    if (this.server) {
      websocketService.initialize(this.server);
      console.log('✅ WebSocket service initialized');
    }
  }

  // Start the server
  async start() {
    try {
      // Initialize middleware
      this.initializeMiddleware();

      // Initialize database
      await this.initializeDatabase();

      // Initialize routes
      this.initializeRoutes();

      // Create HTTP server
      this.server = http.createServer(this.app);

      // Initialize WebSocket
      this.initializeWebSocket();

      // Start listening
      this.server.listen(config.port, () => {
        console.log(`
🚀 Smart Device Management Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Environment: ${config.nodeEnv}
🌐 Server: http://localhost:${config.port}
📋 API Docs: http://localhost:${config.port}/api/${config.api.version}
🔌 WebSocket: ws://localhost:${config.port}/socket.io
💾 Database: ${config.database.mongodb.uri}
🚀 Redis: ${config.redis.host}:${config.redis.port}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📖 API Endpoints:
   • Authentication: /api/${config.api.version}/auth
   • Devices: /api/${config.api.version}/devices
   • Analytics: /api/${config.api.version}/analytics
   • Exports: /api/${config.api.version}/exports
   • Health: /api/${config.api.version}/health

🔒 Features Enabled:
   ✅ Redis Caching (TTL: ${config.cache.deviceTTL}s devices, ${config.cache.analyticsTTL}s analytics)
   ✅ JWT Authentication (Access: ${config.jwt.accessExpiresIn}, Refresh: ${config.jwt.refreshExpiresIn})
   ✅ Rate Limiting (${config.rateLimit.maxRequests} req/${config.rateLimit.windowMs/60000}min)
   ✅ Real-time WebSocket Updates
   ✅ Data Export & Reporting
   ✅ Performance Monitoring
   ✅ Security Headers & CORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `);
      });

      // Graceful shutdown handling
      this.setupGracefulShutdown();

    } catch (error) {
      console.error('❌ Server startup failed:', error);
      process.exit(1);
    }
  }

  // Setup graceful shutdown
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      // Close server
      if (this.server) {
        this.server.close(() => {
          console.log('🔌 HTTP server closed');
        });
      }

      try {
        // Close WebSocket connections
        websocketService.cleanup();

        // Close database connections
        await database.disconnect();
        await redisClient.disconnect();

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      shutdown('UNHANDLED_REJECTION');
    });
  }

  // Get server instance
  getServer() {
    return this.server;
  }

  // Get express app instance
  getApp() {
    return this.app;
  }
}

// Create and start server
const server = new Server();

// Start server if this file is run directly
if (require.main === module) {
  server.start().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = server;

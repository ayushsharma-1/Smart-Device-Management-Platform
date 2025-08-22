const morgan = require('morgan');

// Custom token for response time
morgan.token('response-time-ms', (req, res) => {
  const responseTime = res.getHeader('X-Response-Time');
  return responseTime ? `${responseTime}ms` : '-';
});

// Custom token for user ID
morgan.token('user-id', (req) => {
  return req.user ? req.user.id : 'anonymous';
});

// Custom token for cache status
morgan.token('cache-status', (req, res) => {
  return res.getHeader('X-Cache') || 'NONE';
});

// Performance monitoring middleware
const performanceMonitor = (req, res, next) => {
  const start = process.hrtime();
  
  // Add response time header before response is sent
  const originalSend = res.send;
  res.send = function(body) {
    if (!res.headersSent) {
      const [seconds, nanoseconds] = process.hrtime(start);
      const responseTime = seconds * 1000 + nanoseconds / 1000000;
      res.setHeader('X-Response-Time', responseTime.toFixed(2));
    }
    return originalSend.call(this, body);
  };
  
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const responseTime = seconds * 1000 + nanoseconds / 1000000;
    
    // Log slow requests (> 100ms)
    if (responseTime > 100) {
      console.warn(`🐌 Slow request detected: ${req.method} ${req.originalUrl} - ${responseTime.toFixed(2)}ms`);
    }
    
    // Store metrics for monitoring (you can send to external service)
    if (global.metrics) {
      global.metrics.push({
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: responseTime,
        timestamp: new Date(),
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      // Keep only last 1000 metrics in memory
      if (global.metrics.length > 1000) {
        global.metrics = global.metrics.slice(-1000);
      }
    }
  });
  
  next();
};

// Request logging formats
const logFormats = {
  development: morgan('dev'),
  
  production: morgan(
    ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms :cache-status',
    {
      skip: (req, res) => res.statusCode < 400 // Only log errors in production
    }
  ),
  
  combined: morgan(
    ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time-ms :cache-status'
  )
};

// Initialize global metrics array
if (!global.metrics) {
  global.metrics = [];
}

module.exports = {
  performanceMonitor,
  logFormats
};

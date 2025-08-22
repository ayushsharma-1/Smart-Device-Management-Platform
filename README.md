# Smart Device Management Backend

A comprehensive backend system for managing IoT devices with real-time monitoring, advanced authentication, and data analytics capabilities.

## 🚀 Features

### Core Features (100 Points)
- **API Performance & Caching (30 points)**
  - Redis-based caching with intelligent TTL management
  - Performance monitoring middleware
  - Optimized database queries with indexes
  - Request/response compression

- **Advanced Authentication & Security (25 points)**
  - JWT with refresh token rotation
  - Rate limiting per user/IP
  - Password complexity validation
  - Token blacklisting for logout
  - Organization-based access control

- **Real-time Device Status (25 points)**
  - WebSocket connections for live updates
  - Device heartbeat monitoring
  - Real-time status change notifications
  - Connection state management

- **Data Export & Reporting (20 points)**
  - Async CSV/JSON export jobs
  - Device analytics and statistics
  - Historical data reporting
  - Export job status tracking

### Bonus Features
- **Database Optimization**
  - Compound indexes for efficient queries
  - Connection pooling
  - Query optimization

- **Error Handling & Logging**
  - Structured error responses
  - Comprehensive logging system
  - Performance metrics tracking

## 🛠 Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis
- **Real-time**: Socket.io
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Express-validator
- **Testing**: Jest with Supertest
- **Containerization**: Docker & Docker Compose

## 📁 Project Structure

```
smart-device-backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── database.js  # MongoDB connection
│   │   ├── redis.js     # Redis client setup
│   │   └── index.js     # Environment config
│   ├── models/          # Mongoose schemas
│   │   ├── User.js      # User model
│   │   ├── Device.js    # Device model
│   │   ├── DeviceLog.js # Device logging
│   │   ├── ExportJob.js # Export jobs
│   │   └── BlacklistedToken.js
│   ├── middleware/      # Express middleware
│   │   ├── auth.js      # Authentication
│   │   ├── cache.js     # Redis caching
│   │   ├── rateLimiter.js
│   │   ├── errorHandler.js
│   │   ├── logger.js
│   │   └── performance.js
│   ├── services/        # Business logic
│   │   ├── authService.js
│   │   ├── deviceService.js
│   │   ├── analyticsService.js
│   │   ├── exportService.js
│   │   └── websocketService.js
│   ├── controllers/     # Route handlers
│   │   ├── authController.js
│   │   ├── deviceController.js
│   │   ├── analyticsController.js
│   │   ├── exportController.js
│   │   └── healthController.js
│   ├── routes/          # API routes
│   │   ├── auth.js
│   │   ├── devices.js
│   │   ├── analytics.js
│   │   ├── exports.js
│   │   └── health.js
│   ├── validation/      # Input validation schemas
│   └── server.js        # Application entry point
├── __tests__/           # Test suites
│   ├── integration/     # Integration tests
│   └── unit/           # Unit tests
├── docker-compose.yml   # Container orchestration
├── Dockerfile          # Container definition
├── package.json        # Dependencies & scripts
└── README.md           # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd smart-device-backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start with Docker Compose (Recommended)**
```bash
docker-compose up -d
```

5. **Start services individually (Development)**
```bash
# Start MongoDB & Redis
docker-compose up -d mongodb redis

# Start the application
npm run dev
```

### Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/smart-device-db

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Performance
CACHE_TTL=300
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "organization": "TechCorp"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### Device Management

#### Create Device
```http
POST /api/devices
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "deviceId": "SENSOR_001",
  "name": "Temperature Sensor",
  "type": "sensor",
  "location": "Building A - Room 101",
  "metadata": {
    "model": "TempSense Pro",
    "manufacturer": "SensorTech"
  }
}
```

#### Get Devices (with filters and pagination)
```http
GET /api/devices?type=sensor&status=online&page=1&limit=10
Authorization: Bearer <jwt-token>
```

#### Update Device Status
```http
PUT /api/devices/SENSOR_001/status
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "status": "maintenance",
  "reason": "Scheduled maintenance"
}
```

#### Device Heartbeat
```http
POST /api/devices/SENSOR_001/heartbeat
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "data": {
    "temperature": 23.5,
    "humidity": 65,
    "batteryLevel": 85
  }
}
```

### Analytics & Reporting

#### Get Device Statistics
```http
GET /api/analytics/device-stats
Authorization: Bearer <jwt-token>
```

#### Get Device Analytics
```http
GET /api/analytics/devices/SENSOR_001?period=7d
Authorization: Bearer <jwt-token>
```

### Data Export

#### Create Export Job
```http
POST /api/exports
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "type": "devices",
  "format": "csv",
  "filters": {
    "type": "sensor",
    "status": "online"
  },
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

#### Get Export Jobs
```http
GET /api/exports?status=completed
Authorization: Bearer <jwt-token>
```

#### Download Export
```http
GET /api/exports/{jobId}/download
Authorization: Bearer <jwt-token>
```

## 🔄 Real-time Features

### WebSocket Events

Connect to WebSocket server at `ws://localhost:3000`

**Authentication**
```javascript
socket.emit('authenticate', { token: 'your-jwt-token' });
```

**Subscribe to Device Updates**
```javascript
socket.emit('subscribe', { deviceId: 'SENSOR_001' });
```

**Listen for Status Changes**
```javascript
socket.on('device:status', (data) => {
  console.log('Device status changed:', data);
});

socket.on('device:heartbeat', (data) => {
  console.log('Device heartbeat:', data);
});
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Integration Tests
```bash
npm run test:integration
```

### Run Unit Tests
```bash
npm run test:unit
```

### Test Structure
- **Integration Tests**: Test complete API workflows
- **Unit Tests**: Test individual services and functions
- **Coverage**: Aim for >80% code coverage

## 🐳 Docker Deployment

### Build and Run
```bash
# Build the application image
docker build -t smart-device-backend .

# Run with Docker Compose
docker-compose up -d
```

### Production Deployment
```bash
# Set environment to production
export NODE_ENV=production

# Use production docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

## 📊 Performance & Monitoring

### Built-in Monitoring
- Request/response time tracking
- Error rate monitoring
- Cache hit/miss ratios
- Database connection health

### Health Check Endpoint
```http
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected"
  },
  "performance": {
    "avgResponseTime": 45,
    "requestCount": 1250
  }
}
```

## 🔒 Security Features

- **Input Validation**: All inputs validated using express-validator
- **Rate Limiting**: Configurable per-endpoint rate limits
- **CORS Protection**: Configurable CORS policies
- **Helmet Integration**: Security headers middleware
- **JWT Security**: Secure token handling with rotation
- **Password Security**: Bcrypt hashing with salt rounds

## 🚀 Performance Optimizations

- **Redis Caching**: Intelligent caching with TTL management
- **Database Indexes**: Optimized queries with compound indexes
- **Connection Pooling**: Efficient database connection management
- **Response Compression**: Gzip compression for API responses
- **Query Optimization**: Lean queries and selective field population

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact: [your-email@example.com]

---

**Built with ❤️ for CurveTech Backend Developer Assignment**

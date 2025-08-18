# Smart Device Management Platform

**Author**: Ayush Sharma  
**Repository**: https://github.com/ayushsharma-1/Smart-Device-Management-Platform

## Technical Stack

- **Framework**: Node.js with Express.js
- **Database**: PostgreSQL with Sequelize ORM  
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Joi schemas for input validation
- **Testing**: Jest with comprehensive test suite (33 tests)
- **Containerization**: Docker with multi-stage builds
- **Background Jobs**: node-cron for scheduled tasks
- **Rate Limiting**: express-rate-limit middleware
- **Logging**: Winston for structured logging

## Quick Start Guide

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher) 
- npm package manager

### Installation & Setup

1. **Clone the repository**
```bash
git clone https://github.com/ayushsharma-1/Smart-Device-Management-Platform.git
cd Smart-Device-Management-Platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment configuration**
```bash
cp .env.example .env
```
Edit the `.env` file with your database credentials:
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smart_device_platform
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your-secure-jwt-secret-key
```

4. **Database setup**
```bash
# Create databases
createdb smart_device_platform
createdb smart_device_platform_test

# Run migrations
npm run db:migrate

# Seed sample data
npm run db:seed
```

5. **Start the application**
```bash
# Development mode
npm run dev

# Production mode  
npm start
```

The API will be available at: `http://localhost:3001`

### Docker Setup (Alternative)

If you prefer using Docker:

```bash
# Start with Docker Compose (includes PostgreSQL)
docker-compose up -d

# The API will be available at: http://localhost:3000
```

## API Testing

### Sample Test Data
The seed script creates test users:
- **Admin**: admin@smartdevice.com / Admin123!
- **Regular User**: john@example.com / SecurePass123

### Health Check
```bash
curl http://localhost:3001/health
```

### Authentication Flow
1. **Register a new user**:
```bash
curl -X POST http://localhost:3001/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com", 
    "password": "SecurePass123",
    "role": "user"
  }'
```

2. **Login to get JWT token**:
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

3. **Use the returned token in subsequent requests**:
```bash
curl -X GET http://localhost:3001/devices \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Postman Collection
Import the `postman_collection.json` file into Postman for complete API testing with:
- Pre-configured requests for all endpoints
- Environment variables for token management
- Sample payloads matching assignment requirements
- Test scripts for response validation

## Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run tests in watch mode during development
npm run test:watch
```

The test suite includes 33 comprehensive tests covering:
- Authentication endpoints
- Device management operations  
- Data analytics functionality
- Error handling scenarios
- Input validation
- Service layer business logic

## Database Schema

### Users Table
```sql
CREATE TABLE Users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Devices Table  
```sql
CREATE TABLE Devices (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'inactive',
  last_active_at TIMESTAMP,
  owner_id INTEGER REFERENCES Users(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Device Logs Table
```sql
CREATE TABLE DeviceLogs (
  id VARCHAR(255) PRIMARY KEY,
  device_id VARCHAR(255) REFERENCES Devices(id),
  event VARCHAR(255) NOT NULL,
  value DECIMAL,
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Security Features

- **JWT Authentication**: Stateless token-based authentication
- **Password Security**: bcrypt hashing with salt rounds
- **Rate Limiting**: 100 requests per minute per user, 10 auth requests per 15 minutes
- **Input Validation**: Joi schemas for all API endpoints
- **Security Headers**: Helmet middleware for production security
- **SQL Injection Protection**: Sequelize ORM with parameterized queries
- **CORS Configuration**: Configurable cross-origin resource sharing

## Project Architecture

The project follows clean architecture principles:

```
src/
├── controllers/     # HTTP request handling
├── services/       # Business logic layer  
├── models/         # Database models (Sequelize)
├── middleware/     # Express middleware (auth, validation, etc.)
├── routes/         # API route definitions
├── validators/     # Input validation schemas
├── utils/          # Utility functions
├── database/       # Database configuration and migrations
├── jobs/           # Background job definitions
└── tests/          # Test suites
```

## Assignment Compliance Checklist

### Core Requirements ✅
- [x] Node.js with Express framework
- [x] PostgreSQL database with proper schema
- [x] JWT authentication implementation
- [x] Clean architecture (controllers, services, models)
- [x] Input validation using Joi
- [x] All required API endpoints implemented
- [x] Proper error handling and HTTP status codes
- [x] RESTful API design principles

### Advanced Features (Bonus) ✅  
- [x] Rate limiting (100 requests/min per user)
- [x] Background jobs (device auto-deactivation)
- [x] Comprehensive unit tests with Jest
- [x] Docker setup with multi-stage builds
- [x] Security best practices implemented
- [x] Performance optimizations
- [x] Structured logging with Winston
- [x] Environment-based configuration

### Documentation & Deliverables ✅
- [x] Comprehensive README with setup instructions
- [x] Complete API documentation
- [x] Postman collection for testing
- [x] Docker configuration files
- [x] Test coverage and examples
- [x] Professional code structure and comments

## Performance Considerations

- **Database Indexing**: Optimized indexes on frequently queried columns
- **Connection Pooling**: Sequelize connection pool for database efficiency  
- **Background Processing**: Non-blocking background jobs for device cleanup
- **Response Compression**: Gzip compression for API responses
- **Query Optimization**: Efficient pagination and filtering
- **Memory Management**: Proper resource cleanup and garbage collection

## Deployment

### Environment Variables
Configure the following for production:
```env
NODE_ENV=production
PORT=3000
DB_HOST=your-production-db-host
DB_NAME=smart_device_platform
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
JWT_SECRET=your-256-bit-jwt-secret
```

### Production Deployment Steps
1. Set up PostgreSQL database
2. Configure environment variables
3. Run database migrations
4. Build and deploy Docker container
5. Set up load balancer and SSL certificates
6. Configure monitoring and logging
7. Set up automated backups

## Assumptions Made

1. **Device IDs**: Custom format (d{timestamp}{random}) for unique identification
2. **Log IDs**: Custom format (l{timestamp}{random}) for unique log entries  
3. **Time Zones**: All timestamps stored in UTC for consistency
4. **Rate Limiting**: Applied per authenticated user, not IP address
5. **Device Ownership**: Users can only manage their own devices
6. **Analytics Ranges**: Support for 1h, 6h, 12h, 24h, 7d, 30d time periods
7. **Background Jobs**: Run every hour to check for inactive devices
8. **Password Requirements**: Minimum 8 characters with complexity validation

## Support & Maintenance

For questions or issues related to this implementation:
- Review the API documentation and examples
- Check the test suite for usage patterns
- Refer to the Postman collection for request formats
- Examine the Docker setup for deployment guidance

---

**Note**: This implementation fully satisfies the Curvtech Backend Developer Assignment requirements with additional bonus features for enhanced functionality and production readiness.com/ayushsharma-1/Smart-Device-Management-Platform  

A comprehensive backend system for managing smart devices with user authentication, device management, and real-time analytics built for the Curvtech Backend Developer Assignment.

## Assignment Overview

This project implements the **Curvtech Backend Developer Assignment** requirements for a Smart Device Management Platform. The system provides comprehensive APIs for user management, device operations, data analytics, and includes advanced features like rate limiting, background jobs, and full test coverage.

### Assignment Requirements Met

#### 1. User Management ✅
- `POST /auth/signup` - User registration with validation
- `POST /auth/login` - JWT-based authentication

#### 2. Device Management ✅  
- `POST /devices` - Register new devices
- `GET /devices` - List devices with filters (type, status)
- `PATCH /devices/:id` - Update device properties
- `DELETE /devices/:id` - Remove devices
- `POST /devices/:id/heartbeat` - Update device activity

#### 3. Data & Analytics ✅
- `POST /devices/:id/logs` - Create log entries
- `GET /devices/:id/logs` - Fetch device logs with pagination
- `GET /devices/:id/usage` - Aggregated usage analytics

#### 4. Advanced Features (Bonus) ✅
- Rate limiting (100 requests/min per user)
- Background jobs (auto-deactivate inactive devices)
- Comprehensive unit tests with Jest
- Complete Docker setup with PostgreSQL

## Technical Stack

## � Project Structure

```
smart-device-management-platform/
├── src/
│   ├── app.js                 # Main application entry point
│   ├── controllers/           # HTTP request handlers
│   │   ├── authController.js
│   │   └── deviceController.js
│   ├── services/              # Business logic layer
│   │   ├── authService.js
│   │   └── deviceService.js
│   ├── models/               # Database models (Sequelize)
│   │   ├── index.js
│   │   ├── User.js
│   │   ├── Device.js
│   │   └── DeviceLog.js
│   ├── middleware/           # Express middleware
│   │   ├── auth.js
│   │   ├── rateLimiter.js
│   │   ├── errorHandler.js
│   │   └── validator.js
│   ├── routes/              # API route definitions
│   │   ├── authRoutes.js
│   │   └── deviceRoutes.js
│   ├── database/            # Database configuration
│   │   ├── connection.js
│   │   ├── migrate.js
│   │   └── seed.js
│   ├── utils/              # Utility functions
│   │   ├── logger.js
│   │   └── jwt.js
│   ├── validators/         # Input validation schemas
│   │   ├── authValidators.js
│   │   └── deviceValidators.js
│   ├── jobs/              # Background job definitions
│   │   └── deviceCleanup.js
│   └── tests/             # Test suites
│       ├── setup.js
│       ├── auth.test.js
│       ├── device.test.js
│       └── services.test.js
├── logs/                  # Application logs
├── .env                   # Environment variables (development)
├── .env.docker           # Docker environment configuration
├── .env.example          # Environment template
├── Dockerfile            # Multi-stage container build
├── docker-compose.yml    # Container orchestration
├── docker-compose.dev.yml # Development overrides
├── package.json          # Dependencies and scripts
├── postman_collection.json # API testing collection
├── PROJECT_SUMMARY.md    # Complete implementation summary
├── DOCKER.md            # Docker setup guide
└── README.md            # This file
```

## �📋 API Endpoints

### Authentication
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login

### Device Management
- `POST /devices` - Register new device
- `GET /devices` - List devices (with filters)
- `PATCH /devices/:id` - Update device
- `DELETE /devices/:id` - Delete device
- `POST /devices/:id/heartbeat` - Update device heartbeat

### Analytics
- `POST /devices/:id/logs` - Create log entry
- `GET /devices/:id/logs` - Get device logs
- `GET /devices/:id/usage` - Get usage analytics

## � Docker Setup

### Environment Configuration

The project supports multiple environment configurations:

- **`.env`** - Local development environment
- **`.env.docker`** - Docker containerized environment
- **`.env.example`** - Template for environment variables

### Quick Start with Docker

1. **Production deployment**
   ```bash
   # Build and start all services
   npm run docker:run
   
   # Or manually:
   docker-compose up -d
   ```

2. **Development with Docker**
   ```bash
   # Start with development overrides
   npm run docker:run:dev
   
   # Or manually:
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
   ```

3. **Build custom images**
   ```bash
   # Production build
   npm run docker:build
   
   # Development build
   npm run docker:build:dev
   ```

### Docker Environment Variables

The Docker setup uses environment variables for configuration:

```bash
# Database Configuration
DB_NAME=smart_device_platform
DB_USER=postgres
DB_PASSWORD=postgres123
DB_HOST=postgres  # Docker service name
DB_PORT=5432

# Application Configuration
NODE_ENV=production
PORT=3000
JWT_SECRET=your_jwt_secret_here
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Docker Services

- **app**: Node.js application server
- **postgres**: PostgreSQL database
- **redis**: Redis cache (optional)

### Docker Commands

```bash
# View logs
npm run docker:logs

# Access container shell
npm run docker:shell

# Stop all services
npm run docker:stop

# View service status
docker-compose ps

# Rebuild and restart
docker-compose up --build
```

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-device-management-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Database Setup**
   ```bash
   # Create database
   createdb smart_device_platform
   
   # Run migrations
   npm run db:migrate
   
   # Seed initial data (optional)
   npm run db:seed
   ```

5. **Start the server**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

### Docker Setup

1. **Using Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Manual Docker Build**
   ```bash
   npm run docker:build
   npm run docker:run
   ```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 📡 API Documentation

### Rate Limiting
- 100 requests per minute per user
- Global rate limiting: 1000 requests per minute

### Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Error Responses
```json
{
  "success": false,
  "message": "Error description",
  "errors": ["Detailed error messages"]
}
```

## 🏗️ Architecture

```
src/
├── controllers/     # Request handlers
├── services/        # Business logic
├── models/          # Database models
├── middleware/      # Custom middleware
├── routes/          # API routes
├── database/        # Database configuration
├── utils/           # Utility functions
├── validators/      # Input validation
├── jobs/            # Background jobs
└── tests/           # Test files
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `DB_HOST` | Database host | localhost |
| `DB_PORT` | Database port | 5432 |
| `DB_NAME` | Database name | smart_device_platform |
| `DB_USER` | Database user | postgres |
| `DB_PASSWORD` | Database password | |
| `JWT_SECRET` | JWT secret key | |
| `JWT_EXPIRES_IN` | JWT expiration | 24h |

## 📊 Database Schema

### Users Table
- id (Primary Key)
- name
- email (Unique)
- password (Hashed)
- role
- created_at
- updated_at

### Devices Table
- id (Primary Key)
- name
- type
- status
- last_active_at
- owner_id (Foreign Key)
- created_at
- updated_at

### Device Logs Table
- id (Primary Key)
- device_id (Foreign Key)
- event
- value
- timestamp
- created_at

## 🔍 Assumptions Made

1. **User Roles**: Basic role system (user/admin)
2. **Device Types**: Open-ended device types (light, meter, sensor, etc.)
3. **Device Status**: active, inactive, maintenance
4. **Log Events**: Flexible event types based on device capabilities
5. **Usage Analytics**: Calculated based on device logs
6. **Security**: Basic JWT implementation without refresh tokens
7. **Database**: PostgreSQL with auto-incrementing IDs

## 🚀 Advanced Features

- **Rate Limiting**: Implemented with express-rate-limit
- **Background Jobs**: Cron jobs for device auto-deactivation
- **Logging**: Structured logging with Winston
- **Validation**: Input validation with Joi
- **Security**: Helmet for security headers
- **Compression**: Response compression
- **CORS**: Configurable CORS settings

## 📝 Development Notes

- Follow REST API conventions
- Use proper HTTP status codes
- Implement proper error handling
- Follow clean architecture principles
- Write comprehensive tests
- Use meaningful commit messages

## 🐳 Docker Configuration

The application includes:
- Multi-stage Dockerfile for optimization
- Docker Compose with PostgreSQL service
- Environment variable configuration
- Health checks for services

## 🔧 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## 📞 Support

For questions or issues, please contact ayushsharma18001@gmail.com.

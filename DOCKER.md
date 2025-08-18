# Docker Configuration Guide

## Overview

The Smart Device Management Platform has been configured to work seamlessly with Docker using environment variables. This setup provides flexibility for different deployment scenarios.

## Files Structure

- `Dockerfile` - Multi-stage build with development and production targets
- `docker-compose.yml` - Main orchestration file using environment variables
- `docker-compose.dev.yml` - Development overrides
- `.env.docker` - Docker-specific environment configuration
- `.env` - Local development environment

## Environment Configuration

### Docker Environment Variables (.env.docker)
```env
NODE_ENV=production
PORT=3000
DB_HOST=postgres          # Docker service name
DB_PORT=5432
DB_NAME=smart_device_platform
DB_USER=postgres
DB_PASSWORD=postgres123
JWT_SECRET=40a16223751a2d3d7c64e1030f203509a210e57e96c79e83729d1053b5f5f2a1
JWT_EXPIRES_IN=24h
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
DEVICE_TIMEOUT_HOURS=24
CORS_ORIGIN=http://localhost:3000
```

### Local Development Environment (.env)
```env
NODE_ENV=development
PORT=3001
DB_HOST=localhost         # Local database
DB_PORT=5432
# ... (other variables same as above)
```

## Usage Commands

### Production Deployment
```bash
# Start all services (app + database + redis)
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

### Development Mode
```bash
# Start with development overrides
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# This will:
# - Use local .env file
# - Enable live code reload
# - Connect to host database
# - Use development port (3001)
```

### Build Commands
```bash
# Production build
docker build -t smart-device-platform .

# Development build
docker build --target development -t smart-device-platform:dev .

# Using npm scripts
npm run docker:build      # Production
npm run docker:build:dev  # Development
```

## Docker Compose Services

### App Service
- **Image**: Built from local Dockerfile
- **Environment**: Uses `.env.docker` file
- **Ports**: Maps host port to container port (configurable)
- **Volumes**: Logs directory mounted for persistence
- **Health Check**: Monitors `/health` endpoint
- **Dependencies**: Waits for PostgreSQL to be healthy

### PostgreSQL Service
- **Image**: postgres:15-alpine
- **Environment**: Database credentials from env variables
- **Volumes**: Persistent data storage + init script
- **Health Check**: Uses `pg_isready` command

### Redis Service (Optional)
- **Image**: redis:7-alpine
- **Purpose**: Caching layer for future enhancements
- **Volumes**: Persistent cache storage

## Multi-Stage Dockerfile

### Stages Available:
1. **base** - Common setup with package files
2. **development** - Includes dev dependencies, uses nodemon
3. **builder** - Production dependencies only
4. **production** - Final optimized image with non-root user

### Development Usage:
```bash
docker build --target development -t app:dev .
docker run -p 3000:3000 -v $(pwd)/src:/app/src app:dev
```

### Production Usage:
```bash
docker build -t app:prod .
docker run -p 3000:3000 app:prod
```

## Security Features

- **Non-root user**: Production image runs as `nodejs` user
- **Health checks**: Automated service monitoring
- **Environment isolation**: Separate configs for dev/prod
- **Volume mounts**: Secure file system access
- **Network isolation**: Custom bridge network

## Environment Variable Precedence

1. Command line environment variables
2. docker-compose.yml environment section
3. .env.docker file (for Docker)
4. .env file (for local development)
5. Default values in application code

## Troubleshooting

### Port Conflicts
- Check if ports 3000, 5432, 6379 are available
- Modify port mappings in docker-compose.yml if needed

### Database Connection Issues
- Ensure PostgreSQL service is healthy: `docker-compose ps`
- Check database credentials in .env.docker
- Verify network connectivity between services

### Build Issues
- Clear Docker cache: `docker system prune`
- Rebuild without cache: `docker-compose build --no-cache`

### Environment Variables Not Loading
- Verify .env.docker file exists and has correct syntax
- Check docker-compose.yml for env_file configuration
- Use `docker-compose config` to validate configuration

## Production Deployment Checklist

- [ ] Update JWT_SECRET with secure 256-bit key
- [ ] Change default database password
- [ ] Configure proper CORS_ORIGIN for your domain
- [ ] Set appropriate LOG_LEVEL (warn/error for production)
- [ ] Configure external database if not using containerized PostgreSQL
- [ ] Set up SSL/TLS termination (reverse proxy)
- [ ] Configure backup strategy for PostgreSQL volume
- [ ] Monitor resource usage and set container limits
- [ ] Set up log aggregation and monitoring

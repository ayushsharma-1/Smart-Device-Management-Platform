#!/bin/bash

# Smart Device Backend Startup Script
# This script handles Docker daemon issues and provides alternatives

echo "🚀 Smart Device Backend Startup Script"
echo "======================================"

# Check if Docker is running
check_docker() {
    if docker info >/dev/null 2>&1; then
        echo "✅ Docker daemon is running"
        return 0
    else
        echo "❌ Docker daemon is not running"
        return 1
    fi
}

# Check if Redis is running locally
check_redis() {
    if redis-cli ping >/dev/null 2>&1; then
        echo "✅ Redis is running locally"
        return 0
    else
        echo "❌ Redis is not running locally"
        return 1
    fi
}

# Start Redis locally (if available)
start_redis_local() {
    echo "🔄 Attempting to start Redis locally..."
    if command -v redis-server >/dev/null 2>&1; then
        redis-server --daemonize yes --port 6379
        sleep 2
        if check_redis; then
            echo "✅ Redis started successfully"
            return 0
        fi
    fi
    echo "❌ Could not start Redis locally"
    return 1
}

# Main execution
echo "🔍 Checking system requirements..."

# Check if Node.js is installed
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    exit 1
fi

echo "✅ Node.js is installed: $(node --version)"

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# Try Docker first
if check_docker; then
    echo "🐳 Starting with Docker Compose..."
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        echo "✅ Docker services started successfully"
        echo "🌱 Seeding database with test data..."
        sleep 10  # Wait for services to be ready
        npm run seed
        echo ""
        echo "🎉 Application is ready!"
        echo "📍 API: http://localhost:3000"
        echo "📍 Health Check: http://localhost:3000/api/health"
        echo ""
        echo "🔐 Test Credentials:"
        echo "   Admin: admin@curvetech.com / AdminPass123!"
        echo "   User: john@techcorp.com / AdminPass123!"
        exit 0
    fi
fi

# Fallback: Run without Docker
echo ""
echo "🔄 Docker not available. Starting in local mode..."
echo "⚠️  Note: You'll need Redis running for full functionality"

# Check/start Redis
if ! check_redis; then
    echo "🔄 Trying to start Redis locally..."
    start_redis_local
fi

# Update .env for local mode
if check_redis; then
    echo "✅ Redis is available at localhost:6379"
else
    echo "⚠️  Redis not available. Some features may not work."
    echo "💡 Install Redis: sudo apt-get install redis-server"
fi

# Seed database
echo "🌱 Seeding database with test data..."
npm run seed

# Start the application
echo "🚀 Starting the application..."
npm run dev &

APP_PID=$!
echo "📍 Application PID: $APP_PID"
echo ""
echo "🎉 Application is starting!"
echo "📍 API: http://localhost:3000"
echo "📍 Health Check: http://localhost:3000/api/health"
echo ""
echo "🔐 Test Credentials:"
echo "   Admin: admin@curvetech.com / AdminPass123!"
echo "   User: john@techcorp.com / AdminPass123!"
echo ""
echo "🛑 To stop: kill $APP_PID or Ctrl+C"

# Wait for the application
wait $APP_PID

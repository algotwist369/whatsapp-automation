#!/bin/bash

# WhatsApp Broadcast Production Deployment Script
# This script sets up the production environment

set -e

echo "🚀 Starting WhatsApp Broadcast Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
print_status "Creating necessary directories..."
mkdir -p backend/sessions backend/uploads backend/logs
mkdir -p frontend/.next

# Set proper permissions
print_status "Setting proper permissions..."
chmod 755 backend/sessions backend/uploads backend/logs
chmod 755 frontend/.next

# Copy environment files if they don't exist
if [ ! -f backend/.env ]; then
    print_warning "Backend .env file not found. Please copy environment-config.production.env to backend/.env and configure it."
    cp backend/environment-config.production.env backend/.env
fi

if [ ! -f frontend/.env.local ]; then
    print_warning "Frontend .env.local file not found. Please copy environment-config.production.env.local to frontend/.env.local and configure it."
    cp frontend/environment-config.production.env.local frontend/.env.local
fi

# Build and start services
print_status "Building and starting Docker containers..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
print_status "Waiting for services to start..."
sleep 30

# Check service health
print_status "Checking service health..."

# Check MongoDB
if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    print_status "✅ MongoDB is healthy"
else
    print_error "❌ MongoDB is not responding"
    exit 1
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    print_status "✅ Redis is healthy"
else
    print_error "❌ Redis is not responding"
    exit 1
fi

# Check Backend
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    print_status "✅ Backend API is healthy"
else
    print_error "❌ Backend API is not responding"
    exit 1
fi

# Check Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "✅ Frontend is healthy"
else
    print_error "❌ Frontend is not responding"
    exit 1
fi

print_status "🎉 Deployment completed successfully!"
print_status "Frontend: http://localhost:3000"
print_status "Backend API: http://localhost:5000"
print_status "Health Check: http://localhost:5000/health"

echo ""
print_status "Useful commands:"
echo "  View logs: docker-compose logs -f"
echo "  Stop services: docker-compose down"
echo "  Restart services: docker-compose restart"
echo "  Update services: docker-compose pull && docker-compose up -d"

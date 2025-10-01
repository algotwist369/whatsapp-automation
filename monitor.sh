#!/bin/bash

# WhatsApp Broadcast Performance Monitoring Script
# This script monitors the performance and health of the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}[MONITOR]${NC} $1"
}

# Check if Docker Compose is running
if ! docker-compose ps | grep -q "Up"; then
    print_error "Docker Compose services are not running. Please start them first."
    exit 1
fi

print_header "WhatsApp Broadcast Performance Monitor"
echo "=========================================="

# System Resources
print_header "System Resources"
echo "CPU Usage:"
docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo ""
print_header "Memory Usage"
free -h

echo ""
print_header "Disk Usage"
df -h

# Service Health Checks
print_header "Service Health Checks"

# Check MongoDB
if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    print_status "✅ MongoDB: Healthy"
else
    print_error "❌ MongoDB: Unhealthy"
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    print_status "✅ Redis: Healthy"
else
    print_error "❌ Redis: Unhealthy"
fi

# Check Backend API
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    print_status "✅ Backend API: Healthy"
    
    # Get API performance metrics
    echo "Backend Performance Metrics:"
    curl -s http://localhost:5000/api/performance/metrics | jq '.' 2>/dev/null || echo "Performance metrics not available"
else
    print_error "❌ Backend API: Unhealthy"
fi

# Check Frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    print_status "✅ Frontend: Healthy"
else
    print_error "❌ Frontend: Unhealthy"
fi

# Log Analysis
print_header "Recent Error Logs"
echo "Backend Errors (last 10):"
docker-compose logs backend --tail=50 | grep -i error | tail -10 || echo "No recent errors found"

echo ""
echo "Frontend Errors (last 10):"
docker-compose logs frontend --tail=50 | grep -i error | tail -10 || echo "No recent errors found"

# Database Stats
print_header "Database Statistics"
echo "MongoDB Stats:"
docker-compose exec -T mongodb mongosh whatsapp_broadcast --eval "
db.stats().then(stats => {
    console.log('Collections:', stats.collections);
    console.log('Data Size:', (stats.dataSize / 1024 / 1024).toFixed(2), 'MB');
    console.log('Index Size:', (stats.indexSize / 1024 / 1024).toFixed(2), 'MB');
    console.log('Storage Size:', (stats.storageSize / 1024 / 1024).toFixed(2), 'MB');
}).catch(console.error);
"

# Redis Stats
echo ""
echo "Redis Stats:"
docker-compose exec -T redis redis-cli info memory | grep -E "(used_memory_human|used_memory_peak_human|maxmemory_human)"

# Network Connections
print_header "Network Connections"
netstat -tuln | grep -E ":(3000|5000|27017|6379)"

# Process Information
print_header "Process Information"
ps aux | grep -E "(node|mongod|redis)" | grep -v grep

echo ""
print_header "Monitoring Complete"
echo "Use 'docker-compose logs -f' to follow logs in real-time"
echo "Use 'docker-compose restart <service>' to restart a service"

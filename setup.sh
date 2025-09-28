#!/bin/bash

# ===========================================
# WHATSAPP BULK MESSENGER - SETUP SCRIPT
# ===========================================

echo "🚀 Setting up WhatsApp Bulk Messenger..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js is installed: $NODE_VERSION"
    else
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
        exit 1
    fi
}

# Check if MongoDB is running
check_mongodb() {
    if command -v mongod &> /dev/null; then
        if pgrep -x "mongod" > /dev/null; then
            print_success "MongoDB is running"
        else
            print_warning "MongoDB is not running. Please start MongoDB service."
            print_status "On Ubuntu/Debian: sudo systemctl start mongod"
            print_status "On macOS: brew services start mongodb-community"
        fi
    else
        print_warning "MongoDB is not installed. Please install MongoDB from https://www.mongodb.com/try/download/community"
    fi
}

# Check if Redis is running
check_redis() {
    if command -v redis-server &> /dev/null; then
        if pgrep -x "redis-server" > /dev/null; then
            print_success "Redis is running"
        else
            print_warning "Redis is not running. Please start Redis service."
            print_status "On Ubuntu/Debian: sudo systemctl start redis"
            print_status "On macOS: brew services start redis"
        fi
    else
        print_warning "Redis is not installed. Please install Redis from https://redis.io/download"
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing root dependencies..."
    npm install

    print_status "Installing backend dependencies..."
    cd backend && npm install && cd ..

    print_status "Installing frontend dependencies..."
    cd frontend && npm install && cd ..

    print_success "All dependencies installed successfully!"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."

    # Backend environment
    if [ ! -f "backend/.env" ]; then
        cp backend/environment-config.env backend/.env
        print_success "Created backend/.env file"
    else
        print_warning "backend/.env already exists"
    fi

    # Frontend environment
    if [ ! -f "frontend/.env.local" ]; then
        cp frontend/environment-config.env.local frontend/.env.local
        print_success "Created frontend/.env.local file"
    else
        print_warning "frontend/.env.local already exists"
    fi

    # Root environment
    if [ ! -f ".env" ]; then
        cp environment-config.env .env
        print_success "Created root .env file"
    else
        print_warning ".env already exists"
    fi
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."

    mkdir -p backend/sessions
    mkdir -p backend/uploads
    mkdir -p backend/logs
    mkdir -p frontend/public

    print_success "Directories created successfully!"
}

# Generate JWT secret
generate_jwt_secret() {
    print_status "Generating JWT secret..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    
    # Update .env files with generated secret
    if [ -f "backend/.env" ]; then
        sed -i "s/your-super-secret-jwt-key-here-make-it-very-long-and-random-123456789/$JWT_SECRET/g" backend/.env
    fi
    
    print_success "JWT secret generated and updated in environment files"
}

# Main setup function
main() {
    echo "============================================"
    echo "  WhatsApp Bulk Messenger Setup"
    echo "============================================"
    echo ""

    # Check prerequisites
    print_status "Checking prerequisites..."
    check_node
    check_mongodb
    check_redis
    echo ""

    # Install dependencies
    print_status "Installing dependencies..."
    install_dependencies
    echo ""

    # Setup environment
    print_status "Setting up environment files..."
    setup_environment
    echo ""

    # Create directories
    print_status "Creating directories..."
    create_directories
    echo ""

    # Generate JWT secret
    print_status "Generating security keys..."
    generate_jwt_secret
    echo ""

    # Final instructions
    print_success "Setup completed successfully!"
    echo ""
    echo "============================================"
    echo "  NEXT STEPS"
    echo "============================================"
    echo ""
    echo "1. 🔑 Get your OpenAI API key:"
    echo "   - Visit: https://platform.openai.com/api-keys"
    echo "   - Create a new API key"
    echo "   - Add it to backend/.env as OPENAI_API_KEY"
    echo ""
    echo "2. 🗄️  Start your services:"
    echo "   - MongoDB: sudo systemctl start mongod (Linux) or brew services start mongodb-community (macOS)"
    echo "   - Redis: sudo systemctl start redis (Linux) or brew services start redis (macOS)"
    echo ""
    echo "3. 🚀 Start the application:"
    echo "   - Development: npm run dev"
    echo "   - Backend only: npm run server"
    echo "   - Frontend only: npm run client"
    echo ""
    echo "4. 🌐 Access the application:"
    echo "   - Frontend: http://localhost:3000"
    echo "   - Backend API: http://localhost:5000"
    echo "   - Health check: http://localhost:5000/health"
    echo ""
    echo "5. 📱 Connect WhatsApp:"
    echo "   - Register/Login to the application"
    echo "   - Go to Dashboard and click 'Connect WhatsApp'"
    echo "   - Scan QR code with your WhatsApp Business account"
    echo ""
    echo "============================================"
    echo ""
    print_warning "IMPORTANT: Update your environment files with actual credentials before starting!"
    print_warning "Especially: OPENAI_API_KEY, MONGODB_URI, and REDIS_URL"
    echo ""
}

# Run main function
main

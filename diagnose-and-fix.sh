#!/bin/bash

echo "🔍 DIAGNOSING AUTO-REPLY SYSTEM"
echo "================================"
echo ""

# Get the first user's ID and token for testing
# This assumes you have at least one user in the system
echo "Step 1: Getting user information..."

# Check if backend is responding
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend is running and responding"
else
    echo "❌ Backend is not responding"
    echo "Starting backend..."
    cd /home/ankit/Desktop/DOS/Projects/new-whatsapp-broadcast/backend
    npm run dev &
    sleep 10
fi

echo ""
echo "Step 2: Testing auto-reply system..."
echo ""
echo "To complete the diagnosis, I need your JWT token."
echo "You can get it from:"
echo "1. Open frontend: http://localhost:3000"
echo "2. Login to your account"
echo "3. Open browser console (F12)"
echo "4. Type: localStorage.getItem('token')"
echo "5. Copy the token"
echo ""
echo "Then run:"
echo ""
echo "export TOKEN='your-jwt-token-here'"
echo ""
echo "curl http://localhost:5000/api/whatsapp/debug -H \"Authorization: Bearer \$TOKEN\""
echo ""
echo "curl http://localhost:5000/api/auto-reply -H \"Authorization: Bearer \$TOKEN\""
echo ""
echo "================================"
echo "If you see no auto-reply rules, create one:"
echo ""
echo "curl -X POST http://localhost:5000/api/auto-reply \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{"
echo "    \"name\": \"Test Auto Reply\","
echo "    \"isActive\": true,"
echo "    \"triggerKeywords\": [\"hello\", \"hi\", \"hey\", \"test\"],"
echo "    \"responseType\": \"text\","
echo "    \"responseTemplate\": \"Hello! This is an automatic reply. How can I help you?\","
echo "    \"category\": \"general\","
echo "    \"priority\": 5"
echo "  }'"
echo ""


#!/bin/bash

echo "🔧 AUTO-REPLY FIX SCRIPT"
echo "======================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd /home/ankit/Desktop/DOS/Projects/new-whatsapp-broadcast/backend

# Step 1: Check if backend is running
echo "Step 1: Checking backend status..."
if pm2 list | grep -q "whatsapp-backend.*online"; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running${NC}"
    echo "Starting backend..."
    pm2 start npm --name "whatsapp-backend" -- start
    echo "Waiting 10 seconds for startup..."
    sleep 10
fi

# Step 2: Restart backend to reinitialize
echo ""
echo "Step 2: Restarting backend to reinitialize..."
pm2 restart whatsapp-backend
echo "Waiting 30 seconds for WhatsApp connection..."
sleep 30

# Step 3: Check logs for WhatsApp connection
echo ""
echo "Step 3: Checking WhatsApp connection..."
if pm2 logs whatsapp-backend --lines 100 --nostream | grep -q "WhatsApp client is ready"; then
    echo -e "${GREEN}✅ WhatsApp is connected${NC}"
else
    echo -e "${YELLOW}⚠️  WhatsApp might not be connected${NC}"
    echo "Please connect WhatsApp via frontend if needed"
fi

# Step 4: Check message listener
echo ""
echo "Step 4: Checking message listener..."
if pm2 logs whatsapp-backend --lines 100 --nostream | grep -q "Message listener set up"; then
    echo -e "${GREEN}✅ Message listener is set up${NC}"
else
    echo -e "${RED}❌ Message listener not found${NC}"
    echo "This might be why auto-reply is not working"
fi

# Step 5: Check auto-reply configuration
echo ""
echo "Step 5: Checking auto-reply configuration..."
AUTOREPLY_COUNT=$(mongosh whatsapp-broadcast --quiet --eval "db.autoreplies.countDocuments({isActive:true})" 2>/dev/null)
if [ -n "$AUTOREPLY_COUNT" ] && [ "$AUTOREPLY_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $AUTOREPLY_COUNT active auto-reply rule(s)${NC}"
else
    echo -e "${RED}❌ No active auto-reply rules found${NC}"
    echo "You need to create an auto-reply rule!"
    echo ""
    echo "Create one via:"
    echo "1. Frontend: Go to Auto-Reply page → Create New"
    echo "2. OR use this curl command:"
    echo ""
    echo "curl -X POST http://localhost:5000/api/auto-reply \\"
    echo "  -H 'Authorization: Bearer YOUR_TOKEN' \\"
    echo "  -H 'Content-Type: application/json' \\"
    echo "  -d '{"
    echo "    \"name\": \"Welcome Message\","
    echo "    \"isActive\": true,"
    echo "    \"triggerKeywords\": [\"hello\", \"hi\", \"hey\", \"test\"],"
    echo "    \"responseType\": \"text\","
    echo "    \"responseTemplate\": \"Hello! Thank you for contacting us. How can I help you?\","
    echo "    \"category\": \"general\","
    echo "    \"priority\": 5"
    echo "  }'"
fi

# Step 6: Check OpenAI configuration
echo ""
echo "Step 6: Checking OpenAI configuration..."
if grep -q "OPENAI_API_KEY=sk-" environment-config.env 2>/dev/null; then
    echo -e "${GREEN}✅ OpenAI API key is configured${NC}"
else
    echo -e "${YELLOW}⚠️  OpenAI API key not found or not set${NC}"
    echo "This is needed for AI-powered auto-replies"
    echo "Add to environment-config.env: OPENAI_API_KEY=sk-your-key"
fi

# Step 7: Final status
echo ""
echo "======================="
echo "FINAL STATUS"
echo "======================="

# Summary
ISSUES=0

if ! pm2 list | grep -q "whatsapp-backend.*online"; then
    echo -e "${RED}❌ Backend not running${NC}"
    ISSUES=$((ISSUES+1))
fi

if ! pm2 logs whatsapp-backend --lines 100 --nostream | grep -q "WhatsApp client is ready"; then
    echo -e "${RED}❌ WhatsApp not connected${NC}"
    ISSUES=$((ISSUES+1))
fi

if ! pm2 logs whatsapp-backend --lines 100 --nostream | grep -q "Message listener set up"; then
    echo -e "${RED}❌ Message listener not set up${NC}"
    ISSUES=$((ISSUES+1))
fi

if [ -z "$AUTOREPLY_COUNT" ] || [ "$AUTOREPLY_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ No auto-reply rules${NC}"
    ISSUES=$((ISSUES+1))
fi

if [ $ISSUES -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Auto-reply should be working now!"
    echo ""
    echo "To test:"
    echo "1. Send 'hello' to your WhatsApp number"
    echo "2. Watch logs: pm2 logs whatsapp-backend --lines 0"
    echo "3. You should receive an auto-reply"
else
    echo ""
    echo -e "${YELLOW}⚠️  Found $ISSUES issue(s)${NC}"
    echo ""
    echo "Please fix the issues above and run this script again"
fi

echo ""
echo "To monitor in real-time:"
echo "pm2 logs whatsapp-backend --lines 0"
echo ""


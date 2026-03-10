#!/bin/bash

# Login Fix Verification Script
# This script helps verify that the login fix is working correctly

echo "======================================"
echo "OMNIA Login Fix Verification"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "1. Checking if backend is running on port 3001..."
if curl -s http://localhost:3001/api/v1/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is running on port 3001${NC}"
else
    echo -e "${RED}❌ Backend is NOT running on port 3001${NC}"
    echo -e "${YELLOW}   Start backend: cd apps/backend && pnpm start:dev${NC}"
    exit 1
fi

echo ""
echo "2. Testing login endpoint with default admin credentials..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@omnia.com","password":"Admin123!"}')

if echo "$RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✅ Login successful! Received access_token${NC}"
    echo ""
    echo "Response preview:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
else
    echo -e "${RED}❌ Login failed!${NC}"
    echo ""
    echo "Response:"
    echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
    echo ""
    echo -e "${YELLOW}Possible issues:${NC}"
    echo "   - Database not seeded (run: cd apps/backend && pnpm prisma db seed)"
    echo "   - Wrong credentials"
    echo "   - Backend error (check backend logs)"
    exit 1
fi

echo ""
echo "======================================"
echo -e "${GREEN}All checks passed! ✅${NC}"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Test login from web: http://localhost:3000/login"
echo "2. Test login from desktop app"
echo ""
echo "Default credentials:"
echo "  Email: admin@omnia.com"
echo "  Password: Admin123!"

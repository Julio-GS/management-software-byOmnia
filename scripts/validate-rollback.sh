#!/bin/bash

##############################################
# Rollback Validation Script
# For Railway Deployment of Management Software
#
# Purpose: Validates services after rollback to ensure stability
# Usage: ./scripts/validate-rollback.sh <BACKEND_URL> <FRONTEND_URL>
# Example: ./scripts/validate-rollback.sh https://backend.railway.app https://frontend.railway.app
##############################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track validation results
PASSED=0
FAILED=0
WARNINGS=0

# Check arguments
if [ $# -ne 2 ]; then
    echo -e "${RED}Error: Missing required arguments${NC}"
    echo "Usage: $0 <BACKEND_URL> <FRONTEND_URL>"
    echo "Example: $0 https://backend.railway.app https://frontend.railway.app"
    exit 1
fi

BACKEND_URL="$1"
FRONTEND_URL="$2"

# Remove trailing slashes
BACKEND_URL="${BACKEND_URL%/}"
FRONTEND_URL="${FRONTEND_URL%/}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Railway Rollback Validation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${BLUE}Backend URL:${NC}  $BACKEND_URL"
echo -e "${BLUE}Frontend URL:${NC} $FRONTEND_URL"
echo ""

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN:${NC} $1"
    ((WARNINGS++))
}

info() {
    echo -e "${BLUE}ℹ INFO:${NC} $1"
}

# Check if curl available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is required but not installed${NC}"
    exit 1
fi

##############################################
# 1. Service Availability
##############################################

echo -e "${BLUE}[1/6] Checking Service Availability...${NC}"

# Backend availability
BACKEND_PING=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/v1/health" 2>&1)
if [ "$BACKEND_PING" = "200" ]; then
    pass "Backend service is reachable"
else
    fail "Backend service unreachable (HTTP $BACKEND_PING)"
fi

# Frontend availability
FRONTEND_PING=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>&1)
if [ "$FRONTEND_PING" = "200" ]; then
    pass "Frontend service is reachable"
else
    fail "Frontend service unreachable (HTTP $FRONTEND_PING)"
fi

echo ""

##############################################
# 2. Health Endpoints
##############################################

echo -e "${BLUE}[2/6] Verifying Health Endpoints...${NC}"

HEALTH_RESPONSE=$(curl -s "$BACKEND_URL/api/v1/health" 2>&1)

if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"' || echo "$HEALTH_RESPONSE" | grep -q '"status": "ok"'; then
    pass "Backend health check reports 'ok' status"
else
    fail "Backend health check not reporting 'ok' status"
    echo "$HEALTH_RESPONSE"
fi

# Check database health
if echo "$HEALTH_RESPONSE" | grep -q '"database".*"status":"up"'; then
    pass "Database connection is healthy"
else
    fail "Database connection issue detected"
fi

# Check memory health
if echo "$HEALTH_RESPONSE" | grep -q '"memory_heap".*"status":"up"'; then
    pass "Memory heap is healthy"
else
    warn "Memory heap status check failed"
fi

echo ""

##############################################
# 3. Critical API Endpoints
##############################################

echo -e "${BLUE}[3/6] Testing Critical API Endpoints...${NC}"

# Test authentication endpoint (should return 400/401, not 500)
AUTH_TEST=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BACKEND_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' 2>&1)

if [ "$AUTH_TEST" = "400" ] || [ "$AUTH_TEST" = "401" ]; then
    pass "Authentication endpoint responding correctly"
elif [ "$AUTH_TEST" = "404" ]; then
    fail "Authentication endpoint not found (404)"
elif [ "$AUTH_TEST" = "500" ]; then
    fail "Authentication endpoint has server error (500)"
else
    warn "Authentication endpoint returned unexpected code: $AUTH_TEST"
fi

# Test products endpoint (might be protected, so 401 is acceptable)
PRODUCTS_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/v1/products" 2>&1)
if [ "$PRODUCTS_TEST" = "200" ] || [ "$PRODUCTS_TEST" = "401" ]; then
    pass "Products endpoint is accessible"
elif [ "$PRODUCTS_TEST" = "404" ]; then
    fail "Products endpoint not found (404)"
elif [ "$PRODUCTS_TEST" = "500" ]; then
    fail "Products endpoint has server error (500)"
else
    info "Products endpoint returned: $PRODUCTS_TEST"
fi

echo ""

##############################################
# 4. Database Connectivity & Data Integrity
##############################################

echo -e "${BLUE}[4/6] Checking Database Connectivity...${NC}"

# Already checked via health endpoint, but verify again
DB_STATUS=$(curl -s "$BACKEND_URL/api/v1/health" | grep -o '"database"[^}]*')

if echo "$DB_STATUS" | grep -q '"status":"up"'; then
    pass "Database is connected and responsive"
    info "Database status: $DB_STATUS"
else
    fail "Database connection failed after rollback"
    echo "$DB_STATUS"
fi

# Additional database integrity check
# Try to fetch a protected resource (should get 401, not 500)
DB_INTEGRITY=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/v1/categories" 2>&1)
if [ "$DB_INTEGRITY" != "500" ]; then
    pass "Database queries are not throwing server errors"
else
    fail "Database queries returning 500 errors (possible schema mismatch)"
fi

echo ""

##############################################
# 5. Frontend Functionality
##############################################

echo -e "${BLUE}[5/6] Verifying Frontend Functionality...${NC}"

# Test homepage
HOME_TEST=$(curl -s "$FRONTEND_URL" 2>&1)
if echo "$HOME_TEST" | grep -q "<html\|<HTML"; then
    pass "Frontend serves valid HTML"
else
    fail "Frontend not serving HTML correctly"
fi

# Test login page
LOGIN_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/login" 2>&1)
if [ "$LOGIN_TEST" = "200" ]; then
    pass "Login page is accessible"
else
    fail "Login page unreachable (HTTP $LOGIN_TEST)"
fi

# Test dashboard (should redirect to login or return 200)
DASHBOARD_TEST=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/dashboard" 2>&1)
if [ "$DASHBOARD_TEST" = "200" ] || [ "$DASHBOARD_TEST" = "307" ] || [ "$DASHBOARD_TEST" = "302" ]; then
    pass "Dashboard route is functional"
else
    warn "Dashboard route returned unexpected code: $DASHBOARD_TEST"
fi

echo ""

##############################################
# 6. Configuration Verification
##############################################

echo -e "${BLUE}[6/6] Verifying Configuration...${NC}"

# Check CORS headers
CORS_CHECK=$(curl -s -I -H "Origin: $FRONTEND_URL" "$BACKEND_URL/api/v1/health" 2>&1)

if echo "$CORS_CHECK" | grep -qi "access-control-allow-origin"; then
    pass "CORS headers are present"
    
    if echo "$CORS_CHECK" | grep -qi "access-control-allow-origin: \*"; then
        warn "CORS is using wildcard (*) - potential security issue"
    else
        pass "CORS is properly configured (not using wildcard)"
    fi
else
    fail "CORS headers missing"
fi

# Check SSL/TLS
if [[ "$BACKEND_URL" == https://* ]]; then
    pass "Backend is using HTTPS"
else
    warn "Backend is using HTTP (insecure)"
fi

if [[ "$FRONTEND_URL" == https://* ]]; then
    pass "Frontend is using HTTPS"
else
    warn "Frontend is using HTTP (insecure)"
fi

echo ""

##############################################
# Summary
##############################################

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Rollback Validation Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Rollback successful! All critical systems are operational.${NC}"
    
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}⚠ Note: $WARNINGS warnings detected - review recommended${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}Post-Rollback Actions:${NC}"
    echo "1. Monitor Railway logs for any errors"
    echo "2. Test critical user workflows manually"
    echo "3. Verify data integrity in database"
    echo "4. Document rollback reason and resolution"
    echo "5. Plan fix for the issue that caused rollback"
    echo ""
    echo -e "${GREEN}System is stable and ready for production use.${NC}"
    exit 0
else
    echo -e "${RED}✗ Rollback validation failed with $FAILED errors${NC}"
    echo -e "${RED}✗ System may not be stable - investigate immediately${NC}"
    echo ""
    echo -e "${BLUE}Emergency Actions:${NC}"
    echo "1. Check Railway dashboard for service status"
    echo "2. Review logs: railway logs --service backend --since 1h"
    echo "3. Verify environment variables are correct"
    echo "4. Consider rolling back to earlier stable deployment"
    echo "5. Check database migrations status"
    echo "6. Contact team/support if issue persists"
    echo ""
    echo -e "${RED}⚠ DO NOT proceed to production until all errors are resolved${NC}"
    exit 1
fi

#!/bin/bash

##############################################
# Post-Deployment Validation Script
# For Railway Deployment of Management Software
#
# Purpose: Validates deployed services are working correctly
# Usage: ./scripts/validate-post-deploy.sh <BACKEND_URL> <FRONTEND_URL>
# Example: ./scripts/validate-post-deploy.sh https://backend.railway.app https://frontend.railway.app
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
echo -e "${BLUE}Railway Post-Deployment Validation${NC}"
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

# Check if curl/jq available
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is required but not installed${NC}"
    exit 1
fi

##############################################
# 1. Backend Health Check
##############################################

echo -e "${BLUE}[1/8] Testing Backend Health Endpoint...${NC}"

HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/v1/health" 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    pass "Backend health endpoint returns 200 OK"
    
    # Check response structure
    if echo "$RESPONSE_BODY" | grep -q '"status"'; then
        pass "Health response has 'status' field"
        
        # Check status is "ok"
        if echo "$RESPONSE_BODY" | grep -q '"status":"ok"' || echo "$RESPONSE_BODY" | grep -q '"status": "ok"'; then
            pass "Health status is 'ok'"
        else
            fail "Health status is not 'ok'"
            echo "$RESPONSE_BODY"
        fi
    else
        warn "Health response structure unexpected"
    fi
else
    fail "Backend health endpoint returned HTTP $HTTP_CODE"
    echo "$RESPONSE_BODY"
fi

echo ""

##############################################
# 2. Database Connectivity (via Health Check)
##############################################

echo -e "${BLUE}[2/8] Verifying Database Connectivity...${NC}"

if echo "$RESPONSE_BODY" | grep -q '"database"'; then
    if echo "$RESPONSE_BODY" | grep -q '"database".*"status":"up"'; then
        pass "Database is connected and healthy"
    else
        fail "Database connectivity issue detected"
        echo "$RESPONSE_BODY"
    fi
else
    warn "Database status not included in health check"
fi

echo ""

##############################################
# 3. Backend Authentication Endpoint
##############################################

echo -e "${BLUE}[3/8] Testing Authentication Endpoint...${NC}"

AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BACKEND_URL/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"invalid","password":"invalid"}' 2>&1)
AUTH_CODE=$(echo "$AUTH_RESPONSE" | tail -n1)

# We expect 401 Unauthorized for invalid credentials (which means auth is working)
if [ "$AUTH_CODE" = "401" ]; then
    pass "Authentication endpoint is accessible (401 for invalid creds)"
elif [ "$AUTH_CODE" = "400" ]; then
    pass "Authentication endpoint is accessible (400 bad request)"
elif [ "$AUTH_CODE" = "404" ]; then
    fail "Authentication endpoint not found (404)"
else
    warn "Authentication endpoint returned unexpected code: $AUTH_CODE"
fi

echo ""

##############################################
# 4. CORS Configuration
##############################################

echo -e "${BLUE}[4/8] Checking CORS Configuration...${NC}"

CORS_RESPONSE=$(curl -s -I -H "Origin: $FRONTEND_URL" "$BACKEND_URL/api/v1/health" 2>&1)

if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
    pass "CORS headers present"
    
    # Check if origin matches frontend URL
    if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin: $FRONTEND_URL"; then
        pass "CORS allows requests from frontend URL"
    elif echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin: \*"; then
        fail "CORS is using wildcard (*) - SECURITY RISK!"
    else
        warn "CORS origin doesn't match frontend URL"
        echo "$CORS_RESPONSE" | grep -i "access-control-allow-origin"
    fi
    
    # Check credentials
    if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-credentials: true"; then
        pass "CORS allows credentials"
    else
        warn "CORS doesn't allow credentials"
    fi
else
    fail "CORS headers not found"
fi

echo ""

##############################################
# 5. WebSocket Endpoint
##############################################

echo -e "${BLUE}[5/8] Checking WebSocket Endpoint...${NC}"

# Convert https to wss
WS_URL=$(echo "$BACKEND_URL" | sed 's/^https/wss/' | sed 's/^http/ws/')
WS_URL="$WS_URL/sync"

info "WebSocket URL: $WS_URL"

# Test WebSocket handshake (requires wscat or websocat)
if command -v wscat &> /dev/null; then
    info "Testing WebSocket with wscat..."
    # Timeout after 5 seconds
    WS_TEST=$(timeout 5s wscat -c "$WS_URL" -H "Origin: $FRONTEND_URL" 2>&1 || true)
    
    if echo "$WS_TEST" | grep -q "connected\|Connected\|401\|Unauthorized"; then
        pass "WebSocket endpoint is accessible"
    else
        warn "WebSocket connection test inconclusive"
    fi
else
    info "wscat not installed - skipping WebSocket connection test"
    info "Install with: npm install -g wscat"
    
    # Fallback: Check if upgrade request is accepted
    WS_HANDSHAKE=$(curl -s -I -H "Upgrade: websocket" -H "Connection: Upgrade" \
        -H "Origin: $FRONTEND_URL" "$BACKEND_URL/sync" 2>&1)
    
    if echo "$WS_HANDSHAKE" | grep -qi "101\|upgrade"; then
        pass "WebSocket upgrade handshake successful"
    elif echo "$WS_HANDSHAKE" | grep -qi "401\|403"; then
        pass "WebSocket endpoint exists (auth required)"
    else
        warn "WebSocket endpoint status unclear"
    fi
fi

echo ""

##############################################
# 6. Frontend Homepage
##############################################

echo -e "${BLUE}[6/8] Testing Frontend Homepage...${NC}"

FRONTEND_RESPONSE=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL" 2>&1)
FRONTEND_CODE=$(echo "$FRONTEND_RESPONSE" | tail -n1)
FRONTEND_BODY=$(echo "$FRONTEND_RESPONSE" | head -n-1)

if [ "$FRONTEND_CODE" = "200" ]; then
    pass "Frontend homepage returns 200 OK"
    
    # Check for basic HTML structure
    if echo "$FRONTEND_BODY" | grep -q "<html\|<HTML"; then
        pass "Frontend returns valid HTML"
    else
        warn "Frontend response doesn't look like HTML"
    fi
    
    # Check for Next.js indicators
    if echo "$FRONTEND_BODY" | grep -q "__NEXT_DATA__\|_next"; then
        pass "Next.js detected in frontend response"
    else
        warn "Next.js indicators not found (might be static export)"
    fi
else
    fail "Frontend homepage returned HTTP $FRONTEND_CODE"
    echo "First 200 chars: ${FRONTEND_BODY:0:200}"
fi

echo ""

##############################################
# 7. Frontend API Connection
##############################################

echo -e "${BLUE}[7/8] Testing Frontend → Backend Connection...${NC}"

# Check if frontend can reach backend
# This tests the NEXT_PUBLIC_API_URL configuration

# Look for API calls in the HTML (if CSR) or test a known endpoint
LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" "$FRONTEND_URL/login" 2>&1)
LOGIN_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)

if [ "$LOGIN_CODE" = "200" ]; then
    pass "Frontend /login page accessible"
else
    warn "Frontend /login returned HTTP $LOGIN_CODE"
fi

# Test API proxy (if configured in Next.js)
API_PROXY_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/api/v1/health" 2>&1)
if [ "$API_PROXY_RESPONSE" = "200" ]; then
    pass "Frontend API proxy is configured"
elif [ "$API_PROXY_RESPONSE" = "404" ]; then
    info "Frontend doesn't proxy API (direct backend calls expected)"
else
    info "Frontend API proxy test inconclusive (status: $API_PROXY_RESPONSE)"
fi

echo ""

##############################################
# 8. SSL/TLS Configuration
##############################################

echo -e "${BLUE}[8/8] Verifying SSL/TLS Configuration...${NC}"

# Check backend SSL
if [[ "$BACKEND_URL" == https://* ]]; then
    SSL_BACKEND=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/v1/health" 2>&1)
    if [ "$SSL_BACKEND" = "200" ]; then
        pass "Backend SSL/TLS working correctly"
    else
        fail "Backend SSL/TLS issue (HTTP $SSL_BACKEND)"
    fi
else
    warn "Backend is not using HTTPS (insecure)"
fi

# Check frontend SSL
if [[ "$FRONTEND_URL" == https://* ]]; then
    SSL_FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>&1)
    if [ "$SSL_FRONTEND" = "200" ]; then
        pass "Frontend SSL/TLS working correctly"
    else
        fail "Frontend SSL/TLS issue (HTTP $SSL_FRONTEND)"
    fi
else
    warn "Frontend is not using HTTPS (insecure)"
fi

echo ""

##############################################
# Summary
##############################################

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed! Deployment is healthy.${NC}"
    else
        echo -e "${GREEN}✓ Deployment is functional with $WARNINGS warnings.${NC}"
        echo -e "${YELLOW}⚠ Review warnings above for potential issues.${NC}"
    fi
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Test user authentication with real credentials"
    echo "2. Verify database seeding (admin user exists)"
    echo "3. Test critical user flows (POS, inventory, etc.)"
    echo "4. Monitor Railway logs for errors"
    echo "5. Set up monitoring/alerts"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Deployment validation failed with $FAILED errors${NC}"
    echo -e "${RED}✗ Please investigate and fix the issues above${NC}"
    echo ""
    echo -e "${BLUE}Troubleshooting:${NC}"
    echo "1. Check Railway service logs: railway logs --service backend"
    echo "2. Verify environment variables are set correctly"
    echo "3. Ensure health endpoints are implemented"
    echo "4. Check database connection and migrations"
    echo "5. Review RAILWAY_DEPLOYMENT.md for detailed troubleshooting"
    echo ""
    exit 1
fi

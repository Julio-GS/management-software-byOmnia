#!/bin/bash

##############################################
# Pre-Deployment Validation Script
# For Railway Deployment of Management Software
#
# Purpose: Validates project is ready for deployment
# Run: ./scripts/validate-pre-deploy.sh
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

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Railway Pre-Deployment Validation${NC}"
echo -e "${BLUE}========================================${NC}"
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

##############################################
# 1. Check Prerequisites
##############################################

echo -e "${BLUE}[1/10] Checking Prerequisites...${NC}"

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    pass "Node.js installed: $NODE_VERSION"
    
    # Check version is 18+
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_MAJOR" -lt 18 ]; then
        fail "Node.js version must be 18+, found: $NODE_VERSION"
    fi
else
    fail "Node.js not installed"
fi

# Check pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    pass "pnpm installed: $PNPM_VERSION"
else
    fail "pnpm not installed (run: npm install -g pnpm)"
fi

# Check Docker (optional but recommended)
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    pass "Docker installed: $DOCKER_VERSION"
else
    warn "Docker not installed (recommended for local testing)"
fi

# Check Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    pass "Git installed: $GIT_VERSION"
else
    fail "Git not installed"
fi

echo ""

##############################################
# 2. Verify Project Structure
##############################################

echo -e "${BLUE}[2/10] Verifying Project Structure...${NC}"

# Check root files
[ -f "package.json" ] && pass "package.json exists" || fail "package.json missing"
[ -f "pnpm-workspace.yaml" ] && pass "pnpm-workspace.yaml exists" || fail "pnpm-workspace.yaml missing"
[ -f "turbo.json" ] && pass "turbo.json exists" || fail "turbo.json missing"

# Check Railway configs
[ -f "railway.backend.json" ] && pass "railway.backend.json exists" || fail "railway.backend.json missing"
[ -f "railway.frontend.json" ] && pass "railway.frontend.json exists" || fail "railway.frontend.json missing"
[ -f "railway.env.example" ] && pass "railway.env.example exists" || fail "railway.env.example missing"

# Check Dockerfiles
[ -f "apps/backend/Dockerfile.backend" ] && pass "Backend Dockerfile exists" || fail "Backend Dockerfile missing"
[ -f "apps/web/Dockerfile.frontend" ] && pass "Frontend Dockerfile exists" || fail "Frontend Dockerfile missing"

# Check backend structure
[ -d "apps/backend/src" ] && pass "Backend source directory exists" || fail "Backend source directory missing"
[ -f "apps/backend/package.json" ] && pass "Backend package.json exists" || fail "Backend package.json missing"
[ -f "apps/backend/prisma/schema.prisma" ] && pass "Prisma schema exists" || fail "Prisma schema missing"

# Check frontend structure
[ -d "apps/web/app" ] && pass "Frontend app directory exists" || fail "Frontend app directory missing"
[ -f "apps/web/package.json" ] && pass "Frontend package.json exists" || fail "Frontend package.json missing"

# Check shared packages
[ -d "packages/shared-types/src" ] && pass "shared-types package exists" || fail "shared-types package missing"
[ -d "packages/api-client/src" ] && pass "api-client package exists" || fail "api-client package missing"

echo ""

##############################################
# 3. Check Environment Files
##############################################

echo -e "${BLUE}[3/10] Checking Environment Files...${NC}"

# Check .env.example files
[ -f "apps/backend/.env.example" ] && pass "Backend .env.example exists" || warn "Backend .env.example missing"
[ -f "apps/web/.env.example" ] && pass "Frontend .env.example exists" || warn "Frontend .env.example missing"

# Verify railway.env.example has critical variables
if [ -f "railway.env.example" ]; then
    if grep -q "JWT_SECRET" railway.env.example; then
        pass "railway.env.example contains JWT_SECRET"
    else
        fail "railway.env.example missing JWT_SECRET"
    fi
    
    if grep -q "JWT_REFRESH_SECRET" railway.env.example; then
        pass "railway.env.example contains JWT_REFRESH_SECRET"
    else
        fail "railway.env.example missing JWT_REFRESH_SECRET"
    fi
    
    if grep -q "FRONTEND_URL" railway.env.example; then
        pass "railway.env.example contains FRONTEND_URL"
    else
        fail "railway.env.example missing FRONTEND_URL"
    fi
    
    if grep -q "DEFAULT_ADMIN_EMAIL" railway.env.example; then
        pass "railway.env.example contains DEFAULT_ADMIN_EMAIL"
    else
        fail "railway.env.example missing DEFAULT_ADMIN_EMAIL"
    fi
fi

echo ""

##############################################
# 4. Install Dependencies
##############################################

echo -e "${BLUE}[4/10] Installing Dependencies...${NC}"

info "Running: pnpm install"
if pnpm install --frozen-lockfile 2>&1 | tee /tmp/pnpm-install.log | grep -q "Done"; then
    pass "Dependencies installed successfully"
else
    # Check if lockfile is outdated
    if grep -q "lockfile is out of date" /tmp/pnpm-install.log; then
        warn "pnpm-lock.yaml is out of date (run: pnpm install)"
    else
        fail "Dependency installation failed (see output above)"
    fi
fi

echo ""

##############################################
# 5. Build Shared Packages
##############################################

echo -e "${BLUE}[5/10] Building Shared Packages...${NC}"

# Build shared-types
info "Building @management/shared-types..."
if pnpm --filter @management/shared-types build > /tmp/shared-types-build.log 2>&1; then
    pass "shared-types built successfully"
else
    fail "shared-types build failed"
    cat /tmp/shared-types-build.log
fi

# Build api-client
info "Building @management/api-client..."
if pnpm --filter @management/api-client build > /tmp/api-client-build.log 2>&1; then
    pass "api-client built successfully"
else
    fail "api-client build failed"
    cat /tmp/api-client-build.log
fi

echo ""

##############################################
# 6. Build Backend
##############################################

echo -e "${BLUE}[6/10] Building Backend...${NC}"

info "Building backend (NestJS)..."
if pnpm --filter backend build > /tmp/backend-build.log 2>&1; then
    pass "Backend built successfully"
    
    # Check for build artifacts
    if [ -d "apps/backend/dist" ]; then
        pass "Backend dist directory created"
    else
        fail "Backend dist directory not found"
    fi
else
    fail "Backend build failed"
    echo -e "${RED}Build log:${NC}"
    tail -20 /tmp/backend-build.log
fi

echo ""

##############################################
# 7. Build Frontend
##############################################

echo -e "${BLUE}[7/10] Building Frontend...${NC}"

info "Building frontend (Next.js)..."
# Set dummy env vars for build validation
export NEXT_PUBLIC_API_URL="http://localhost:8080/api/v1"

if pnpm --filter web build > /tmp/frontend-build.log 2>&1; then
    pass "Frontend built successfully"
    
    # Check for build artifacts
    if [ -d "apps/web/.next" ]; then
        pass "Frontend .next directory created"
    else
        fail "Frontend .next directory not found"
    fi
else
    fail "Frontend build failed"
    echo -e "${RED}Build log:${NC}"
    tail -20 /tmp/frontend-build.log
fi

echo ""

##############################################
# 8. Validate Railway Configs
##############################################

echo -e "${BLUE}[8/10] Validating Railway Configurations...${NC}"

# Validate railway.backend.json
if [ -f "railway.backend.json" ]; then
    if grep -q '"healthcheckPath"' railway.backend.json; then
        pass "Backend health check configured"
    else
        warn "Backend health check not configured (add healthcheckPath)"
    fi
    
    if grep -q '"healthcheckTimeout"' railway.backend.json; then
        pass "Backend health check timeout configured"
    else
        warn "Backend health check timeout not configured"
    fi
    
    if grep -q "Dockerfile.backend" railway.backend.json; then
        pass "Backend Dockerfile path configured"
    else
        fail "Backend Dockerfile path not configured"
    fi
fi

# Validate railway.frontend.json
if [ -f "railway.frontend.json" ]; then
    if grep -q '"healthcheckPath"' railway.frontend.json; then
        pass "Frontend health check configured"
    else
        warn "Frontend health check not configured (add healthcheckPath)"
    fi
    
    if grep -q '"healthcheckTimeout"' railway.frontend.json; then
        pass "Frontend health check timeout configured"
    else
        warn "Frontend health check timeout not configured"
    fi
    
    if grep -q "Dockerfile.frontend" railway.frontend.json; then
        pass "Frontend Dockerfile path configured"
    else
        fail "Frontend Dockerfile path not configured"
    fi
fi

echo ""

##############################################
# 9. Security Checks
##############################################

echo -e "${BLUE}[9/10] Running Security Checks...${NC}"

# Check for hardcoded secrets
info "Scanning for hardcoded secrets..."
if grep -r "jwt.*secret.*=" apps/backend/src --include="*.ts" | grep -v ".env" | grep -v "process.env" | grep -q .; then
    fail "Found hardcoded JWT secrets in source code"
else
    pass "No hardcoded JWT secrets found"
fi

# Check WebSocket CORS configuration
if grep -q "origin: '\*'" apps/backend/src/sync/sync.gateway.ts; then
    fail "WebSocket uses wildcard CORS (security risk)"
else
    if grep -q "process.env.FRONTEND_URL" apps/backend/src/sync/sync.gateway.ts; then
        pass "WebSocket CORS uses environment variable"
    else
        warn "WebSocket CORS configuration may need review"
    fi
fi

# Check for dependency vulnerabilities
info "Checking for dependency vulnerabilities..."
if pnpm audit --prod > /tmp/audit.log 2>&1; then
    pass "No critical vulnerabilities found"
else
    if grep -q "high\|critical" /tmp/audit.log; then
        warn "High/critical vulnerabilities found (run: pnpm audit)"
        grep -E "high|critical" /tmp/audit.log | head -5
    else
        pass "No high/critical vulnerabilities found"
    fi
fi

echo ""

##############################################
# 10. Docker Build Test (Optional)
##############################################

echo -e "${BLUE}[10/10] Docker Build Test (Optional)...${NC}"

if command -v docker &> /dev/null; then
    info "Testing backend Docker build..."
    if docker build -f apps/backend/Dockerfile.backend -t backend-test-build . > /tmp/docker-backend.log 2>&1; then
        pass "Backend Docker build successful"
        docker rmi backend-test-build 2>&1 > /dev/null
    else
        warn "Backend Docker build failed (see: /tmp/docker-backend.log)"
    fi
    
    info "Testing frontend Docker build..."
    if docker build -f apps/web/Dockerfile.frontend -t frontend-test-build . > /tmp/docker-frontend.log 2>&1; then
        pass "Frontend Docker build successful"
        docker rmi frontend-test-build 2>&1 > /dev/null
    else
        warn "Frontend Docker build failed (see: /tmp/docker-frontend.log)"
    fi
else
    info "Docker not available - skipping Docker build tests"
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
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo -e "${GREEN}✓ Project is ready for Railway deployment${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Commit and push changes to GitHub"
    echo "2. Create Railway project and link GitHub repo"
    echo "3. Add PostgreSQL database service"
    echo "4. Configure environment variables (see railway.env.example)"
    echo "5. Deploy backend service first"
    echo "6. Deploy frontend service"
    echo "7. Run: ./scripts/validate-post-deploy.sh <BACKEND_URL> <FRONTEND_URL>"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Validation failed with $FAILED errors${NC}"
    echo -e "${RED}✗ Please fix the errors above before deploying${NC}"
    echo ""
    exit 1
fi

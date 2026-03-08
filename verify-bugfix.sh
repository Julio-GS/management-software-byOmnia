#!/bin/bash
# Electron Bug Fix Verification Script
# Run this to verify all fixes are working correctly

echo "🔍 ELECTRON BUG FIX VERIFICATION"
echo "=================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print result
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        ((ERRORS++))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

echo "📋 Checking Prerequisites..."
echo "----------------------------"

# Check Node.js version
if command_exists node; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_result 0 "Node.js version: $(node -v) (>= 18.x required)"
    else
        print_result 1 "Node.js version too old: $(node -v) (>= 18.x required)"
    fi
else
    print_result 1 "Node.js not found"
fi

# Check pnpm
if command_exists pnpm; then
    print_result 0 "pnpm installed: $(pnpm -v)"
else
    print_result 1 "pnpm not found"
fi

echo ""
echo "📁 Checking Files..."
echo "----------------------------"

# Check critical files exist
FILES=(
    ".npmrc"
    "apps/desktop/esbuild.config.js"
    "apps/desktop/package.json"
    "apps/desktop/electron/utils/environment.ts"
    "apps/desktop/electron/utils/paths.ts"
    "apps/desktop/electron/utils/logger.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        print_result 0 "File exists: $file"
    else
        print_result 1 "File missing: $file"
    fi
done

echo ""
echo "📦 Checking Dependencies..."
echo "----------------------------"

# Check if node_modules exists
if [ -d "node_modules" ]; then
    print_result 0 "node_modules directory exists"
else
    print_warning "node_modules not found - run 'pnpm install'"
fi

# Check Electron binary
ELECTRON_BINARY="node_modules/.pnpm/electron@28.0.0/node_modules/electron/dist/electron.exe"
if [ -f "$ELECTRON_BINARY" ]; then
    print_result 0 "Electron binary exists"
else
    # Try to find any electron binary
    if [ -d "node_modules/.pnpm" ]; then
        FOUND=$(find node_modules/.pnpm -name "electron.exe" 2>/dev/null | head -1)
        if [ -n "$FOUND" ]; then
            print_result 0 "Electron binary found at: $FOUND"
        else
            print_result 1 "Electron binary not found - run 'pnpm install'"
        fi
    else
        print_result 1 "Electron binary not found"
    fi
fi

# Check new dependencies in package.json
echo ""
echo "🔧 Checking Package Configuration..."
echo "----------------------------"

if [ -f "apps/desktop/package.json" ]; then
    if grep -q "electronmon" "apps/desktop/package.json"; then
        print_result 0 "electronmon dependency found"
    else
        print_result 1 "electronmon dependency missing"
    fi

    if grep -q "esbuild" "apps/desktop/package.json"; then
        print_result 0 "esbuild dependency found"
    else
        print_result 1 "esbuild dependency missing"
    fi

    if grep -q "cross-env" "apps/desktop/package.json"; then
        print_result 0 "cross-env dependency found"
    else
        print_result 1 "cross-env dependency missing"
    fi
fi

# Check .npmrc configuration
echo ""
echo "⚙️  Checking PNPM Configuration..."
echo "----------------------------"

if [ -f ".npmrc" ]; then
    if grep -q "lifecycle-allow-scripts\[\]=electron" ".npmrc"; then
        print_result 0 ".npmrc allows Electron scripts"
    else
        print_result 1 ".npmrc missing Electron script permission"
    fi
else
    print_result 1 ".npmrc file missing"
fi

# Check source code fixes
echo ""
echo "💻 Checking Source Code Fixes..."
echo "----------------------------"

if [ -f "apps/desktop/electron/utils/environment.ts" ]; then
    if grep -q "app.isReady()" "apps/desktop/electron/utils/environment.ts"; then
        print_result 0 "environment.ts has app.isReady() check"
    else
        print_warning "environment.ts might be missing app.isReady() check"
    fi
fi

if [ -f "apps/desktop/electron/utils/paths.ts" ]; then
    if grep -q "app.isReady()" "apps/desktop/electron/utils/paths.ts"; then
        print_result 0 "paths.ts has app.isReady() check"
    else
        print_warning "paths.ts might be missing app.isReady() check"
    fi
fi

# Summary
echo ""
echo "=================================="
echo "📊 VERIFICATION SUMMARY"
echo "=================================="
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You can now run:"
    echo "  pnpm dev:desktop"
    echo ""
    EXIT_CODE=0
else
    echo -e "${RED}✗ $ERRORS error(s) found${NC}"
    echo ""
    echo "Please fix the errors above before running the desktop app."
    echo ""
    echo "Common fixes:"
    echo "  1. Run 'pnpm install' to install dependencies"
    echo "  2. Ensure all source files have been updated"
    echo "  3. Check that .npmrc is present and configured"
    echo ""
    EXIT_CODE=1
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo ""
fi

echo "For more details, see BUGFIX_REPORT.md"
echo ""

exit $EXIT_CODE

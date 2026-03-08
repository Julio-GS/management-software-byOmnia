#!/usr/bin/env pwsh
# Electron Bug Fix Verification Script (Windows PowerShell)
# Run this to verify all fixes are working correctly

Write-Host ""
Write-Host "🔍 ELECTRON BUG FIX VERIFICATION" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

$ErrorCount = 0
$WarningCount = 0

function Test-Command($cmdname) {
    return [bool](Get-Command -Name $cmdname -ErrorAction SilentlyContinue)
}

function Print-Success($message) {
    Write-Host "✓ $message" -ForegroundColor Green
}

function Print-Error($message) {
    Write-Host "✗ $message" -ForegroundColor Red
    $script:ErrorCount++
}

function Print-Warning($message) {
    Write-Host "⚠ $message" -ForegroundColor Yellow
    $script:WarningCount++
}

# Check Prerequisites
Write-Host "📋 Checking Prerequisites..." -ForegroundColor Yellow
Write-Host "----------------------------"

# Check Node.js
if (Test-Command node) {
    $nodeVersion = node -v
    $majorVersion = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($majorVersion -ge 18) {
        Print-Success "Node.js version: $nodeVersion (>= 18.x required)"
    } else {
        Print-Error "Node.js version too old: $nodeVersion (>= 18.x required)"
    }
} else {
    Print-Error "Node.js not found"
}

# Check pnpm
if (Test-Command pnpm) {
    $pnpmVersion = pnpm -v
    Print-Success "pnpm installed: $pnpmVersion"
} else {
    Print-Error "pnpm not found"
}

Write-Host ""
Write-Host "📁 Checking Files..." -ForegroundColor Yellow
Write-Host "----------------------------"

# Check critical files
$files = @(
    ".npmrc",
    "apps\desktop\esbuild.config.js",
    "apps\desktop\package.json",
    "apps\desktop\electron\utils\environment.ts",
    "apps\desktop\electron\utils\paths.ts",
    "apps\desktop\electron\utils\logger.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Print-Success "File exists: $file"
    } else {
        Print-Error "File missing: $file"
    }
}

Write-Host ""
Write-Host "📦 Checking Dependencies..." -ForegroundColor Yellow
Write-Host "----------------------------"

# Check node_modules
if (Test-Path "node_modules") {
    Print-Success "node_modules directory exists"
} else {
    Print-Warning "node_modules not found - run 'pnpm install'"
}

# Check Electron binary
$electronPath = "node_modules\.pnpm\electron@28.0.0\node_modules\electron\dist\electron.exe"
if (Test-Path $electronPath) {
    Print-Success "Electron binary exists"
} else {
    # Try to find any electron binary
    $found = Get-ChildItem -Path "node_modules\.pnpm" -Filter "electron.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($found) {
        Print-Success "Electron binary found at: $($found.FullName)"
    } else {
        Print-Error "Electron binary not found - run 'pnpm install'"
    }
}

Write-Host ""
Write-Host "🔧 Checking Package Configuration..." -ForegroundColor Yellow
Write-Host "----------------------------"

if (Test-Path "apps\desktop\package.json") {
    $packageJson = Get-Content "apps\desktop\package.json" -Raw
    
    if ($packageJson -match "electronmon") {
        Print-Success "electronmon dependency found"
    } else {
        Print-Error "electronmon dependency missing"
    }

    if ($packageJson -match "esbuild") {
        Print-Success "esbuild dependency found"
    } else {
        Print-Error "esbuild dependency missing"
    }

    if ($packageJson -match "cross-env") {
        Print-Success "cross-env dependency found"
    } else {
        Print-Error "cross-env dependency missing"
    }
}

Write-Host ""
Write-Host "⚙️  Checking PNPM Configuration..." -ForegroundColor Yellow
Write-Host "----------------------------"

if (Test-Path ".npmrc") {
    $npmrc = Get-Content ".npmrc" -Raw
    if ($npmrc -match "lifecycle-allow-scripts.*electron") {
        Print-Success ".npmrc allows Electron scripts"
    } else {
        Print-Error ".npmrc missing Electron script permission"
    }
} else {
    Print-Error ".npmrc file missing"
}

Write-Host ""
Write-Host "💻 Checking Source Code Fixes..." -ForegroundColor Yellow
Write-Host "----------------------------"

if (Test-Path "apps\desktop\electron\utils\environment.ts") {
    $envFile = Get-Content "apps\desktop\electron\utils\environment.ts" -Raw
    if ($envFile -match "app\.isReady\(\)") {
        Print-Success "environment.ts has app.isReady() check"
    } else {
        Print-Warning "environment.ts might be missing app.isReady() check"
    }
}

if (Test-Path "apps\desktop\electron\utils\paths.ts") {
    $pathsFile = Get-Content "apps\desktop\electron\utils\paths.ts" -Raw
    if ($pathsFile -match "app\.isReady\(\)") {
        Print-Success "paths.ts has app.isReady() check"
    } else {
        Print-Warning "paths.ts might be missing app.isReady() check"
    }
}

# Summary
Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "📊 VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "✓ All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now run:"
    Write-Host "  pnpm dev:desktop"
    Write-Host ""
    $exitCode = 0
} else {
    Write-Host "✗ $ErrorCount error(s) found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please fix the errors above before running the desktop app."
    Write-Host ""
    Write-Host "Common fixes:"
    Write-Host "  1. Run 'pnpm install' to install dependencies"
    Write-Host "  2. Ensure all source files have been updated"
    Write-Host "  3. Check that .npmrc is present and configured"
    Write-Host ""
    $exitCode = 1
}

if ($WarningCount -gt 0) {
    Write-Host "⚠ $WarningCount warning(s) found" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "For more details, see BUGFIX_REPORT.md"
Write-Host ""

exit $exitCode

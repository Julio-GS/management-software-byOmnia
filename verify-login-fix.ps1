# Login Fix Verification Script (PowerShell)
# This script helps verify that the login fix is working correctly

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "OMNIA Login Fix Verification" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if backend is running
Write-Host "1. Checking if backend is running on port 3001..." -ForegroundColor Yellow
try {
    $healthCheck = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend is running on port 3001" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend is NOT running on port 3001" -ForegroundColor Red
    Write-Host "   Start backend: cd apps/backend && pnpm start:dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 2. Test login endpoint
Write-Host "2. Testing login endpoint with default admin credentials..." -ForegroundColor Yellow

$body = @{
    email = "admin@omnia.com"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/v1/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -ErrorAction Stop

    $jsonResponse = $response.Content | ConvertFrom-Json
    
    if ($jsonResponse.access_token) {
        Write-Host "✅ Login successful! Received access_token" -ForegroundColor Green
        Write-Host ""
        Write-Host "Response preview:" -ForegroundColor Cyan
        $jsonResponse | ConvertTo-Json -Depth 3
    } else {
        Write-Host "❌ Login failed! No access_token in response" -ForegroundColor Red
        Write-Host ""
        Write-Host "Response:" -ForegroundColor Yellow
        $response.Content
    }
} catch {
    Write-Host "❌ Login request failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host ""
        Write-Host "Backend response:" -ForegroundColor Yellow
        Write-Host $responseBody
    }
    
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "   - Database not seeded (run: cd apps/backend && pnpm prisma db seed)"
    Write-Host "   - Wrong credentials"
    Write-Host "   - Backend error (check backend logs)"
    exit 1
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "All checks passed! ✅" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test login from web: http://localhost:3000/login"
Write-Host "2. Test login from desktop app"
Write-Host ""
Write-Host "Default credentials:" -ForegroundColor Yellow
Write-Host "  Email: admin@omnia.com"
Write-Host "  Password: Admin123!"

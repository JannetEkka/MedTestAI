# MedTestAI - Quick Start Script
# Run this in PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MedTestAI - Quick Start Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install dependencies
Write-Host "[1/6] Installing missing npm packages..." -ForegroundColor Yellow
npm install @google-cloud/vertexai @google-cloud/documentai @google-cloud/aiplatform @google-cloud/storage pg dotenv

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Download Cloud SQL Proxy if not exists
Write-Host "[2/6] Checking for Cloud SQL Proxy..." -ForegroundColor Yellow
if (-Not (Test-Path "cloud-sql-proxy.exe")) {
    Write-Host "Downloading Cloud SQL Proxy..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri "https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.8.0/cloud-sql-proxy.x64.exe" -OutFile "cloud-sql-proxy.exe"
    Write-Host "✓ Cloud SQL Proxy downloaded" -ForegroundColor Green
} else {
    Write-Host "✓ Cloud SQL Proxy already exists" -ForegroundColor Green
}

Write-Host ""

# Step 3: Check .env file
Write-Host "[3/6] Checking .env configuration..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✓ .env file found" -ForegroundColor Green
    Write-Host "IMPORTANT: Make sure these are set in .env:" -ForegroundColor Yellow
    Write-Host "  DB_HOST=127.0.0.1" -ForegroundColor White
    Write-Host "  DB_PORT=5432" -ForegroundColor White
    Write-Host "  DB_NAME=medtestai" -ForegroundColor White
    Write-Host "  DB_USER=postgres" -ForegroundColor White
    Write-Host "  DB_PASSWORD=YourSecurePassword123!" -ForegroundColor White
} else {
    Write-Host "✗ .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file with database credentials" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Update App.js
Write-Host "[4/6] Checking App.js backend URL..." -ForegroundColor Yellow
$appJsContent = Get-Content "App.js" -Raw -ErrorAction SilentlyContinue
if ($appJsContent -like "*localhost:3001*") {
    Write-Host "✓ App.js already configured for local development" -ForegroundColor Green
} else {
    Write-Host "⚠ App.js may need URL update for local testing" -ForegroundColor Yellow
    Write-Host "Change production URL to: http://localhost:3001" -ForegroundColor White
}

Write-Host ""

# Step 5: Instructions
Write-Host "[5/6] Setup complete! Next steps:" -ForegroundColor Green
Write-Host ""
Write-Host "TERMINAL 1 - Start Cloud SQL Proxy:" -ForegroundColor Cyan
Write-Host "  .\cloud-sql-proxy.exe pro-variety-472211-b9:us-central1:medtestai-instance" -ForegroundColor White
Write-Host ""
Write-Host "TERMINAL 2 - Start Backend:" -ForegroundColor Cyan
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "TERMINAL 3 - Test Health:" -ForegroundColor Cyan
Write-Host "  Invoke-RestMethod -Uri 'http://localhost:3001/health' -Method Get" -ForegroundColor White
Write-Host ""

# Step 6: Offer to start proxy
Write-Host "[6/6] Ready to start?" -ForegroundColor Yellow
$response = Read-Host "Start Cloud SQL Proxy now? (y/n)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host ""
    Write-Host "Starting Cloud SQL Proxy..." -ForegroundColor Green
    Write-Host "Keep this window open!" -ForegroundColor Yellow
    Write-Host ""
    .\cloud-sql-proxy.exe pro-variety-472211-b9:us-central1:medtestai-instance
} else {
    Write-Host ""
    Write-Host "Setup complete! Start manually when ready." -ForegroundColor Green
}
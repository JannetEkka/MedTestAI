# =============================================
# Fix TestResults.js Syntax Error
# =============================================

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Fixing TestResults.js Syntax Error" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Set project root
$projectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
$testResultsPath = "frontend\src\components\TestResults.js"
$fullPath = Join-Path $projectRoot $testResultsPath

# Verify file exists
if (-not (Test-Path $fullPath)) {
    Write-Host "ERROR: TestResults.js not found at: $fullPath" -ForegroundColor Red
    exit 1
}

# Step 1: Backup
Write-Host "Step 1: Creating backup..." -ForegroundColor Yellow
$backupPath = Join-Path $projectRoot "frontend\src\components\TestResults.js.backup-$timestamp"
Copy-Item $fullPath $backupPath -Force
Write-Host "  Backup created: TestResults.js.backup-$timestamp" -ForegroundColor Green
Write-Host ""

# Step 2: Replace file
Write-Host "Step 2: Replacing with fixed version..." -ForegroundColor Yellow

$fixedFile = "TestResults_FIXED.js"
if (-not (Test-Path $fixedFile)) {
    Write-Host "  ERROR: TestResults_FIXED.js not found in current directory!" -ForegroundColor Red
    Write-Host "  Please ensure TestResults_FIXED.js is in the same directory as this script." -ForegroundColor Yellow
    exit 1
}

Copy-Item $fixedFile $fullPath -Force
Write-Host "  TestResults.js replaced with fixed version" -ForegroundColor Green
Write-Host ""

# Step 3: Clear React cache
Write-Host "Step 3: Clearing React build cache..." -ForegroundColor Yellow
Set-Location (Join-Path $projectRoot "frontend")

$cachePaths = @(
    "node_modules\.cache",
    ".cache",
    "build"
)

foreach ($cachePath in $cachePaths) {
    if (Test-Path $cachePath) {
        Remove-Item -Recurse -Force $cachePath
        Write-Host "  Removed: $cachePath" -ForegroundColor Green
    }
}

Write-Host ""

# Step 4: Instructions
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "FIX APPLIED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "What was fixed:" -ForegroundColor Yellow
Write-Host "  1. Replaced TestResults.js with syntax-error-free version" -ForegroundColor White
Write-Host "  2. Cleared React build cache" -ForegroundColor White
Write-Host "  3. Created backup of original file" -ForegroundColor White
Write-Host ""

Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Stop the frontend server (if running)" -ForegroundColor White
Write-Host "   Press Ctrl+C in the terminal running npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Restart the frontend:" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Cyan
Write-Host "   npm start" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. The app should now compile without errors!" -ForegroundColor White
Write-Host ""

Write-Host "Backup Location:" -ForegroundColor Cyan
Write-Host "   $backupPath" -ForegroundColor White
Write-Host ""

Write-Host "If you still see errors:" -ForegroundColor Yellow
Write-Host "   1. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "   2. Close and reopen VS Code" -ForegroundColor White
Write-Host "   3. Delete node_modules and run: npm install" -ForegroundColor White
Write-Host ""

Write-Host "Good luck!" -ForegroundColor Green
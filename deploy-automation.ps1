# deploy-automation.ps1
# Quick deployment script for MedTestAI automation features

Write-Host "MedTestAI Automation Deployment Script" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

$ProjectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
$OutputsDir = "$ProjectRoot\outputs"

# Check if we're in the right directory
if (-not (Test-Path $ProjectRoot)) {
    Write-Host "ERROR: Project directory not found: $ProjectRoot" -ForegroundColor Red
    Write-Host "Please update the script with your correct project path" -ForegroundColor Yellow
    exit 1
}

Set-Location $ProjectRoot

Write-Host "`nStep 1: Installing Critical Fixes..." -ForegroundColor Yellow

# Backup existing files
Write-Host "Creating backups..." -ForegroundColor Gray
if (Test-Path "services\geminiService.js") {
    Copy-Item "services\geminiService.js" "services\geminiService.js.backup" -Force
}
if (Test-Path "frontend\src\components\RequirementsEditor.js") {
    Copy-Item "frontend\src\components\RequirementsEditor.js" "frontend\src\components\RequirementsEditor.js.backup" -Force
}
if (Test-Path "server.js") {
    Copy-Item "server.js" "server.js.backup" -Force
}

# Copy critical fixes
Write-Host "Installing fixed files..." -ForegroundColor Gray
Copy-Item "$OutputsDir\geminiService.js" "services\" -Force
Copy-Item "$OutputsDir\RequirementsEditor.js" "frontend\src\components\" -Force
Copy-Item "$OutputsDir\server.js" "." -Force

Write-Host "SUCCESS: Critical fixes installed" -ForegroundColor Green

Write-Host "`nStep 2: Installing Automation Services..." -ForegroundColor Yellow

# Copy new services
Copy-Item "$OutputsDir\WebhookManager.js" "services\" -Force
Copy-Item "$OutputsDir\GoogleDriveService.js" "services\" -Force

Write-Host "SUCCESS: Automation services installed" -ForegroundColor Green

Write-Host "`nStep 3: Setting up Chrome Extension..." -ForegroundColor Yellow

# Create extension directory if it doesn't exist
if (-not (Test-Path "chrome-extension")) {
    New-Item -ItemType Directory -Path "chrome-extension" -Force | Out-Null
}

# Copy extension files
Copy-Item "$OutputsDir\manifest.json" "chrome-extension\" -Force
Copy-Item "$OutputsDir\content.js" "chrome-extension\" -Force
Copy-Item "$OutputsDir\background.js" "chrome-extension\" -Force
Copy-Item "$OutputsDir\popup.html" "chrome-extension\" -Force
Copy-Item "$OutputsDir\popup.js" "chrome-extension\" -Force

# Create icons directory
if (-not (Test-Path "chrome-extension\icons")) {
    New-Item -ItemType Directory -Path "chrome-extension\icons" -Force | Out-Null
}

Write-Host "SUCCESS: Chrome extension files ready" -ForegroundColor Green
Write-Host "   Note: Add your own icons to chrome-extension\icons\" -ForegroundColor Gray

Write-Host "`nStep 4: Copying Documentation..." -ForegroundColor Yellow

Copy-Item "$OutputsDir\AUTOMATION_SETUP_README.md" "." -Force
Copy-Item "$OutputsDir\FILES_SUMMARY.md" "." -Force

Write-Host "SUCCESS: Documentation copied" -ForegroundColor Green

Write-Host "`nStep 5: Updating Environment Variables..." -ForegroundColor Yellow

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "WARNING: .env file not found - creating one" -ForegroundColor Yellow
    Copy-Item ".env.example" ".env" -Force -ErrorAction SilentlyContinue
}

# Add webhook URL if not present
$envContent = Get-Content ".env" -Raw
if ($envContent -notmatch "WEBHOOK_BASE_URL") {
    Add-Content ".env" "`nWEBHOOK_BASE_URL=https://medtestai-backend-1067292712875.us-central1.run.app"
    Write-Host "SUCCESS: Added WEBHOOK_BASE_URL to .env" -ForegroundColor Green
} else {
    Write-Host "SUCCESS: WEBHOOK_BASE_URL already in .env" -ForegroundColor Green
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Cyan

Write-Host "`nNEXT STEPS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Test the fixes:" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm start" -ForegroundColor Gray
Write-Host "   -> Upload document -> Edit requirements -> Regenerate" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Start backend with automation:" -ForegroundColor White
Write-Host "   node server.js" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test webhook:" -ForegroundColor White
Write-Host "   curl -X POST http://localhost:3001/api/webhooks/register ..." -ForegroundColor Gray
Write-Host ""
Write-Host "4. Load Chrome extension:" -ForegroundColor White
Write-Host "   -> Open chrome://extensions/" -ForegroundColor Gray
Write-Host "   -> Enable Developer mode" -ForegroundColor Gray
Write-Host "   -> Click 'Load unpacked'" -ForegroundColor Gray
Write-Host "   -> Select chrome-extension folder" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Read the guides:" -ForegroundColor White
Write-Host "   -> FILES_SUMMARY.md (quick overview)" -ForegroundColor Gray
Write-Host "   -> AUTOMATION_SETUP_README.md (detailed guide)" -ForegroundColor Gray
Write-Host ""

Write-Host "Your prototype now has 3 automation methods:" -ForegroundColor Yellow
Write-Host "   [OK] Editable requirements with auto-regeneration" -ForegroundColor Green
Write-Host "   [OK] Webhook automation for external apps" -ForegroundColor Green
Write-Host "   [OK] Chrome extension for auto PRD detection" -ForegroundColor Green
Write-Host "   [OK] Google Drive folder watching" -ForegroundColor Green
Write-Host ""
Write-Host "Good luck with your hackathon!" -ForegroundColor Cyan
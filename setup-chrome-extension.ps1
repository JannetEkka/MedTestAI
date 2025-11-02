# setup-chrome-extension.ps1
# Simple script to set up Chrome extension folder

Write-Host "Setting up Chrome Extension..." -ForegroundColor Cyan
Write-Host ""

$ProjectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
Set-Location $ProjectRoot

# Create chrome-extension directory
if (-not (Test-Path "chrome-extension")) {
    New-Item -ItemType Directory -Path "chrome-extension" -Force | Out-Null
    Write-Host "[OK] Created chrome-extension folder" -ForegroundColor Green
} else {
    Write-Host "[OK] chrome-extension folder already exists" -ForegroundColor Green
}

# Copy extension files from project root to chrome-extension folder
$extensionFiles = @(
    "manifest.json",
    "content.js",
    "background.js",
    "popup.html",
    "popup.js"
)

Write-Host ""
Write-Host "Copying extension files..." -ForegroundColor Yellow

foreach ($file in $extensionFiles) {
    if (Test-Path $file) {
        Copy-Item $file "chrome-extension\" -Force
        Write-Host "  [OK] Copied $file" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] $file not found in project root" -ForegroundColor Yellow
    }
}

# Create icons directory
if (-not (Test-Path "chrome-extension\icons")) {
    New-Item -ItemType Directory -Path "chrome-extension\icons" -Force | Out-Null
    Write-Host ""
    Write-Host "[OK] Created chrome-extension\icons folder" -ForegroundColor Green
    Write-Host "[INFO] Add your icon PNG files (16x16, 48x48, 128x128) to this folder" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Chrome Extension Setup Complete!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Add icon files to chrome-extension\icons\" -ForegroundColor White
Write-Host "   (Need: icon16.png, icon48.png, icon128.png)" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Load in Chrome:" -ForegroundColor White
Write-Host "   a. Open chrome://extensions/" -ForegroundColor Gray
Write-Host "   b. Enable 'Developer mode'" -ForegroundColor Gray
Write-Host "   c. Click 'Load unpacked'" -ForegroundColor Gray
Write-Host "   d. Select the chrome-extension folder" -ForegroundColor Gray
Write-Host ""
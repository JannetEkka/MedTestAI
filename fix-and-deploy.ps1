# fix-and-deploy.ps1
# Complete workflow: Fix CSS + Build + Deploy to Firebase

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "MedTestAI - Fix CSS & Deploy to Firebase" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$projectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
$frontendPath = Join-Path $projectRoot "frontend"
$appCssPath = Join-Path $frontendPath "src\App.css"

# Verify paths
if (-not (Test-Path $projectRoot)) {
    Write-Host "[ERROR] Project directory not found: $projectRoot" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $frontendPath)) {
    Write-Host "[ERROR] Frontend directory not found: $frontendPath" -ForegroundColor Red
    exit 1
}

Set-Location $projectRoot

# ============================================
# STEP 1: Fix CSS
# ============================================

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "STEP 1: Fixing Info Cards CSS" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

if (-not (Test-Path $appCssPath)) {
    Write-Host "[ERROR] App.css not found at: $appCssPath" -ForegroundColor Red
    exit 1
}

# Create backup
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupPath = "$appCssPath.backup-$timestamp"
Copy-Item $appCssPath $backupPath -Force
Write-Host "[OK] Backup created: $(Split-Path $backupPath -Leaf)" -ForegroundColor Green

# Read and update CSS
$cssContent = Get-Content $appCssPath -Raw

if ($cssContent -match 'minmax\(240px, 400px\)') {
    Write-Host "[INFO] CSS already updated with correct card width" -ForegroundColor Gray
    $cssUpdated = $true
} else {
    Write-Host "Updating info-cards-grid width..." -ForegroundColor Cyan
    
    # Try to find and replace
    $pattern1 = '\.info-cards-grid\s*\{\s*display:\s*grid;\s*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\([^)]+\)\);'
    $replacement1 = '.info-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 400px));'
    
    if ($cssContent -match $pattern1) {
        $cssContent = $cssContent -replace $pattern1, $replacement1
        
        # Add justify-content if not present
        if ($cssContent -notmatch 'justify-content:\s*center') {
            $cssContent = $cssContent -replace '(\.info-cards-grid\s*\{[^}]*)', '$1
  justify-content: center;'
        }
        
        $cssContent | Set-Content $appCssPath -Encoding UTF8 -NoNewline
        Write-Host "[SUCCESS] CSS updated successfully!" -ForegroundColor Green
        $cssUpdated = $true
    } else {
        Write-Host "[WARNING] Could not automatically update CSS" -ForegroundColor Yellow
        Write-Host "Please manually update frontend/src/App.css:" -ForegroundColor Yellow
        Write-Host "Change: grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));" -ForegroundColor Gray
        Write-Host "To:     grid-template-columns: repeat(auto-fit, minmax(240px, 400px));" -ForegroundColor Gray
        Write-Host "And add: justify-content: center;" -ForegroundColor Gray
        $cssUpdated = $false
    }
}

# ============================================
# STEP 2: Build Frontend
# ============================================

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "STEP 2: Building Frontend" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

Set-Location $frontendPath

Write-Host "Running: npm run build" -ForegroundColor Cyan
Write-Host "(This may take 30-60 seconds...)" -ForegroundColor Gray

try {
    $buildOutput = npm run build 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Frontend built successfully!" -ForegroundColor Green
        
        # Check build folder
        $buildPath = Join-Path $frontendPath "build"
        if (Test-Path $buildPath) {
            $buildFiles = Get-ChildItem $buildPath -Recurse | Measure-Object
            Write-Host "[INFO] Build folder contains $($buildFiles.Count) files" -ForegroundColor Gray
        }
    } else {
        Write-Host "[ERROR] Build failed!" -ForegroundColor Red
        Write-Host $buildOutput -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "[ERROR] Build failed: $_" -ForegroundColor Red
    exit 1
}

# ============================================
# STEP 3: Firebase Deployment Instructions
# ============================================

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "STEP 3: Deploy to Firebase" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

Write-Host "`nYour frontend is built and ready to deploy!" -ForegroundColor Green
Write-Host "`nTo deploy to Firebase Hosting, run:" -ForegroundColor Cyan
Write-Host "   firebase deploy --only hosting" -ForegroundColor White

Write-Host "`nDo you want to deploy now? (Y/N)" -ForegroundColor Yellow
$response = Read-Host

if ($response -eq 'Y' -or $response -eq 'y') {
    Write-Host "`nChecking Firebase CLI..." -ForegroundColor Cyan
    
    # Check if firebase is installed
    try {
        $firebaseVersion = firebase --version 2>&1
        Write-Host "[OK] Firebase CLI installed: $firebaseVersion" -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] Firebase CLI not found!" -ForegroundColor Red
        Write-Host "Install it with: npm install -g firebase-tools" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "`nDeploying to Firebase..." -ForegroundColor Cyan
    Write-Host "(This may take 1-2 minutes...)" -ForegroundColor Gray
    
    try {
        firebase deploy --only hosting
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "`n[SUCCESS] Deployed to Firebase!" -ForegroundColor Green
            Write-Host "`nYour site is live at:" -ForegroundColor Cyan
            Write-Host "https://pro-variety-472211-b9.web.app" -ForegroundColor White
            Write-Host "`nIMPORTANT: Clear browser cache and hard refresh (Ctrl+F5)" -ForegroundColor Yellow
        } else {
            Write-Host "[ERROR] Deployment failed!" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "[ERROR] Deployment failed: $_" -ForegroundColor Red
        Write-Host "`nTry manually:" -ForegroundColor Yellow
        Write-Host "1. firebase login" -ForegroundColor Gray
        Write-Host "2. firebase deploy --only hosting" -ForegroundColor Gray
    }
} else {
    Write-Host "`n[SKIPPED] Firebase deployment" -ForegroundColor Gray
    Write-Host "`nTo deploy later, run:" -ForegroundColor Cyan
    Write-Host "   cd frontend" -ForegroundColor White
    Write-Host "   firebase deploy --only hosting" -ForegroundColor White
}

# ============================================
# SUMMARY
# ============================================

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "`nCompleted steps:" -ForegroundColor Green
if ($cssUpdated) {
    Write-Host "   [OK] CSS updated (cards now max 400px wide)" -ForegroundColor White
} else {
    Write-Host "   [WARN] CSS needs manual update" -ForegroundColor Yellow
}
Write-Host "   [OK] Frontend built successfully" -ForegroundColor White

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "   1. Deploy to Firebase (if not done above)" -ForegroundColor White
Write-Host "   2. Open: https://pro-variety-472211-b9.web.app" -ForegroundColor White
Write-Host "   3. Clear cache and hard refresh (Ctrl+F5)" -ForegroundColor White
Write-Host "   4. Verify cards are narrower (max 400px)" -ForegroundColor White

Write-Host "`nFiles modified:" -ForegroundColor Gray
Write-Host "   - frontend/src/App.css (backup created)" -ForegroundColor Gray
Write-Host "   - frontend/build/* (rebuilt)" -ForegroundColor Gray

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "Script completed!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

Set-Location $projectRoot
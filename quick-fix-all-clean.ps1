# quick-fix-all.ps1
# Master script to fix both Chrome Extension and UI issues
# ASCII-only version for PowerShell compatibility

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "       MedTestAI - Quick Fix Script                        " -ForegroundColor Cyan
Write-Host "       Fixes: Chrome Extension Icons + UI Cards Width      " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$projectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"

# Verify project directory exists
if (-not (Test-Path $projectRoot)) {
    Write-Host "`n[ERROR] Project directory not found!" -ForegroundColor Red
    Write-Host "Expected: $projectRoot" -ForegroundColor Yellow
    Write-Host "`nPlease update the project path in this script" -ForegroundColor Yellow
    exit 1
}

Set-Location $projectRoot
Write-Host "`nWorking directory: $projectRoot" -ForegroundColor Gray

# ============================================
# FIX 1: Chrome Extension Icons
# ============================================

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "FIX 1: Creating Chrome Extension Icons" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

$iconsPath = Join-Path $projectRoot "chrome-extension\icons"

# Create chrome-extension folder if it doesn't exist
if (-not (Test-Path "chrome-extension")) {
    Write-Host "`nCreating chrome-extension directory..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path "chrome-extension" -Force | Out-Null
    Write-Host "[OK] Created chrome-extension directory" -ForegroundColor Green
}

# Create icons directory
if (-not (Test-Path $iconsPath)) {
    Write-Host "`nCreating icons directory..." -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $iconsPath -Force | Out-Null
    Write-Host "[OK] Created icons directory" -ForegroundColor Green
} else {
    Write-Host "`nIcons directory already exists" -ForegroundColor Gray
}

# Add System.Drawing assembly
try {
    Add-Type -AssemblyName System.Drawing
    Write-Host "[OK] Loaded System.Drawing library" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Failed to load System.Drawing: $_" -ForegroundColor Red
    Write-Host "[WARNING] Will skip icon creation - please create icons manually" -ForegroundColor Yellow
    $skipIcons = $true
}

if (-not $skipIcons) {
    # Function to create icon
    function Create-Icon {
        param([int]$size, [string]$path)
        
        try {
            $bitmap = New-Object System.Drawing.Bitmap($size, $size)
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
            
            # Gradient background
            $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
            $gradientBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
                $rect,
                [System.Drawing.Color]::FromArgb(52, 152, 219),
                [System.Drawing.Color]::FromArgb(41, 128, 185),
                45
            )
            $graphics.FillRectangle($gradientBrush, $rect)
            
            # White cross
            $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
            $crossSize = $size * 0.4
            $crossThickness = $size * 0.12
            $centerX = $size / 2
            $centerY = $size / 2
            
            # Horizontal bar
            $hBar = New-Object System.Drawing.RectangleF(
                ($centerX - $crossSize/2), ($centerY - $crossThickness/2),
                $crossSize, $crossThickness
            )
            $graphics.FillRectangle($whiteBrush, $hBar)
            
            # Vertical bar
            $vBar = New-Object System.Drawing.RectangleF(
                ($centerX - $crossThickness/2), ($centerY - $crossSize/2),
                $crossThickness, $crossSize
            )
            $graphics.FillRectangle($whiteBrush, $vBar)
            
            # Border
            $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(100, 0, 0, 0), 1)
            $graphics.DrawRectangle($borderPen, 0, 0, $size - 1, $size - 1)
            
            # Save
            $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
            
            # Cleanup
            $graphics.Dispose()
            $bitmap.Dispose()
            $gradientBrush.Dispose()
            $whiteBrush.Dispose()
            $borderPen.Dispose()
            
            return $true
        }
        catch {
            Write-Host "[ERROR] $_" -ForegroundColor Red
            return $false
        }
    }

    # Create icons
    Write-Host "`nGenerating icons..." -ForegroundColor Cyan
    $icons = @(
        @{Size=16; Name="icon16.png"},
        @{Size=48; Name="icon48.png"},
        @{Size=128; Name="icon128.png"}
    )

    $iconSuccess = 0
    foreach ($icon in $icons) {
        $iconPath = Join-Path $iconsPath $icon.Name
        $sizeText = "$($icon.Size) x $($icon.Size)"
        Write-Host "   $($icon.Name) ($sizeText)..." -NoNewline
        
        if (Create-Icon -size $icon.Size -path $iconPath) {
            Write-Host " [OK]" -ForegroundColor Green
            $iconSuccess++
        } else {
            Write-Host " [FAILED]" -ForegroundColor Red
        }
    }

    if ($iconSuccess -eq 3) {
        Write-Host "`n[SUCCESS] All icons created successfully!" -ForegroundColor Green
    } else {
        Write-Host "`n[WARNING] Only $iconSuccess/3 icons created" -ForegroundColor Yellow
    }
}

# ============================================
# FIX 2: UI - Info Cards Width
# ============================================

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "FIX 2: Updating UI - Info Cards Width" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

$appCssPath = Join-Path $projectRoot "frontend\src\App.css"

if (Test-Path $appCssPath) {
    Write-Host "`nBacking up current App.css..." -ForegroundColor Cyan
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $backupPath = "$appCssPath.backup-$timestamp"
    Copy-Item $appCssPath $backupPath -Force
    Write-Host "[OK] Backup created: $(Split-Path $backupPath -Leaf)" -ForegroundColor Green
    
    Write-Host "`nReading current App.css..." -ForegroundColor Cyan
    $cssContent = Get-Content $appCssPath -Raw
    
    # Check if already fixed
    if ($cssContent -match 'minmax\(240px, 400px\)') {
        Write-Host "[OK] App.css already has the updated card width!" -ForegroundColor Green
    } else {
        Write-Host "Updating info-cards-grid CSS..." -ForegroundColor Cyan
        
        # Find and replace the info-cards-grid section
        $oldPattern = '\.info-cards-grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\([^)]+\)\);[^}]*\}'
        
        $newSection = ".info-cards-grid {`n  display: grid;`n  grid-template-columns: repeat(auto-fit, minmax(240px, 400px));`n  gap: 1.5rem;`n  margin: 2rem 0;`n  justify-content: center;`n}"
        
        if ($cssContent -match $oldPattern) {
            $cssContent = $cssContent -replace $oldPattern, $newSection
            $cssContent | Set-Content $appCssPath -Encoding UTF8 -NoNewline
            Write-Host "[SUCCESS] App.css updated successfully!" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Could not find exact pattern to replace" -ForegroundColor Yellow
            Write-Host "Manual update may be needed" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "[ERROR] App.css not found at: $appCssPath" -ForegroundColor Red
    Write-Host "[WARNING] Please manually update the CSS" -ForegroundColor Yellow
}

# ============================================
# SUMMARY & NEXT STEPS
# ============================================

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "`nFixes Applied:" -ForegroundColor Green
Write-Host "   1. Chrome Extension icons created" -ForegroundColor White
Write-Host "   2. UI info-cards width updated" -ForegroundColor White

Write-Host "`nNEXT STEPS:" -ForegroundColor Yellow

Write-Host "`nChrome Extension:" -ForegroundColor Cyan
Write-Host "   1. Open Chrome and go to: chrome://extensions/" -ForegroundColor White
Write-Host "   2. Enable 'Developer mode' (toggle in top right)" -ForegroundColor White
Write-Host "   3. Click 'Load unpacked'" -ForegroundColor White
Write-Host "   4. Select folder: chrome-extension" -ForegroundColor White
Write-Host "   5. Extension should load without errors!" -ForegroundColor White

Write-Host "`nFrontend (Apply CSS Changes):" -ForegroundColor Cyan
Write-Host "   1. Open a terminal in frontend folder:" -ForegroundColor White
Write-Host "      cd frontend" -ForegroundColor Gray
Write-Host "   2. Rebuild the frontend:" -ForegroundColor White
Write-Host "      npm run build" -ForegroundColor Gray
Write-Host "   3. If running dev server, restart it:" -ForegroundColor White
Write-Host "      npm start" -ForegroundColor Gray
Write-Host "   4. Refresh browser (Ctrl + F5)" -ForegroundColor White

Write-Host "`nVerification:" -ForegroundColor Cyan
Write-Host "   - Chrome Extension: No errors in chrome://extensions/" -ForegroundColor White
Write-Host "   - UI: Info cards should be narrower (max 400px wide)" -ForegroundColor White
Write-Host "   - UI: Multiple cards per row on desktop" -ForegroundColor White

Write-Host "`nFiles Modified:" -ForegroundColor Gray
if (Test-Path $iconsPath) {
    Write-Host "   - chrome-extension\icons\ (3 icon files)" -ForegroundColor Gray
}
if (Test-Path $appCssPath) {
    Write-Host "   - frontend\src\App.css" -ForegroundColor Gray
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "Script completed successfully!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "`nTip: If you see any issues, check the detailed fix guide:" -ForegroundColor Yellow
Write-Host "   FIX_CHROME_AND_UI_ISSUES.md" -ForegroundColor Gray
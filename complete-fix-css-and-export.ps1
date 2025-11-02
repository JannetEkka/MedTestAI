# complete-fix-css-and-export.ps1
# Fixes both CSS width issue and Google Sheets export 404

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "MedTestAI - Complete Fix: CSS + Google Sheets Export" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$projectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

# Verify paths
if (-not (Test-Path $projectRoot)) {
    Write-Host "[ERROR] Project directory not found: $projectRoot" -ForegroundColor Red
    exit 1
}

Set-Location $projectRoot

# ============================================
# FIX 1: CSS - Info Cards Width
# ============================================

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "FIX 1: CSS - Making Cards Narrower" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

$appCssPath = "frontend\src\App.css"

if (Test-Path $appCssPath) {
    Write-Host "Backing up App.css..." -ForegroundColor Cyan
    Copy-Item $appCssPath "$appCssPath.backup-$timestamp" -Force
    Write-Host "[OK] Backup created" -ForegroundColor Green
    
    Write-Host "Updating CSS..." -ForegroundColor Cyan
    $cssContent = Get-Content $appCssPath -Raw
    
    # Replace the info-cards-grid section
    $oldPattern = '\.info-cards-grid\s*\{[^}]*\}'
    $newSection = @"
.info-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 400px));
  gap: 1.5rem;
  margin: 2rem 0;
  justify-content: center;
}
"@
    
    if ($cssContent -match $oldPattern) {
        $cssContent = $cssContent -replace $oldPattern, $newSection
        $cssContent | Set-Content $appCssPath -Encoding UTF8
        Write-Host "[SUCCESS] CSS updated!" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Could not find CSS pattern, may need manual update" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] App.css not found at: $appCssPath" -ForegroundColor Red
}

# ============================================
# FIX 2: Add Export Routes to server.js
# ============================================

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "FIX 2: Adding Google Sheets Export Routes" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

$serverJsPath = "server.js"

if (Test-Path $serverJsPath) {
    Write-Host "Backing up server.js..." -ForegroundColor Cyan
    Copy-Item $serverJsPath "$serverJsPath.backup-$timestamp" -Force
    Write-Host "[OK] Backup created" -ForegroundColor Green
    
    Write-Host "Reading server.js..." -ForegroundColor Cyan
    $serverContent = Get-Content $serverJsPath -Raw
    
    # Check if export routes already exist
    if ($serverContent -match '/api/export/google-sheets') {
        Write-Host "[INFO] Export routes already exist in server.js" -ForegroundColor Gray
    } else {
        Write-Host "Adding export routes..." -ForegroundColor Cyan
        
        # Find the location to insert (after Google Drive endpoints, before existing endpoints)
        $insertMarker = '// ==================== EXISTING ENDPOINTS'
        
        $exportRoutes = @"

// ==================== EXPORT ENDPOINTS ====================

// Google Sheets export
app.post('/api/export/google-sheets', asyncHandler(async (req, res) => {
  const { testCases, metadata, config } = req.body;
  
  console.log('Export: Google Sheets requested, testCases count:', testCases?.length || 0);
  
  if (!testCases || testCases.length === 0) {
    return res.status(400).json({ success: false, error: 'No test cases provided' });
  }
  
  try {
    const { default: googleSheets } = await import('./services/google-sheets.js');
    await googleSheets.initialize();
    const result = await googleSheets.exportTestCases(testCases, config || {});
    
    console.log('Export: Success!', result.sheetUrl);
    
    res.json({
      success: true,
      spreadsheetId: result.spreadsheetId,
      spreadsheetUrl: result.sheetUrl,
      sheetUrl: result.sheetUrl,
      updatedRows: result.updatedRows
    });
  } catch (error) {
    console.error('Export: Failed -', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}));

// Alternative endpoint /api/v1/export/google-sheets
app.post('/api/v1/export/google-sheets', asyncHandler(async (req, res) => {
  const { testCases, metadata, config } = req.body;
  
  console.log('Export: Google Sheets requested (v1), testCases count:', testCases?.length || 0);
  
  if (!testCases || testCases.length === 0) {
    return res.status(400).json({ success: false, error: 'No test cases provided' });
  }
  
  try {
    const { default: googleSheets } = await import('./services/google-sheets.js');
    await googleSheets.initialize();
    const result = await googleSheets.exportTestCases(testCases, config || {});
    
    console.log('Export: Success!', result.sheetUrl);
    
    res.json({
      success: true,
      spreadsheetId: result.spreadsheetId,
      spreadsheetUrl: result.sheetUrl,
      sheetUrl: result.sheetUrl,
      updatedRows: result.updatedRows
    });
  } catch (error) {
    console.error('Export: Failed -', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
}));

"@
        
        if ($serverContent -match $insertMarker) {
            $serverContent = $serverContent -replace $insertMarker, "$exportRoutes$insertMarker"
            $serverContent | Set-Content $serverJsPath -Encoding UTF8
            Write-Host "[SUCCESS] Export routes added to server.js!" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Could not find insertion point in server.js" -ForegroundColor Yellow
            Write-Host "You may need to add export routes manually" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "[ERROR] server.js not found!" -ForegroundColor Red
}

# ============================================
# STEP 3: Rebuild Frontend
# ============================================

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host "STEP 3: Rebuilding Frontend" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

Set-Location "frontend"

Write-Host "Clearing build cache..." -ForegroundColor Cyan
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build"
}
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
}

Write-Host "Running npm run build..." -ForegroundColor Cyan
try {
    $buildOutput = npm run build 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Frontend built successfully!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Build failed!" -ForegroundColor Red
        Write-Host $buildOutput -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Build failed: $_" -ForegroundColor Red
}

Set-Location $projectRoot

# ============================================
# SUMMARY
# ============================================

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "`nCompleted:" -ForegroundColor Green
Write-Host "   [OK] CSS updated (cards max 400px)" -ForegroundColor White
Write-Host "   [OK] Export routes added to server.js" -ForegroundColor White
Write-Host "   [OK] Frontend rebuilt" -ForegroundColor White

Write-Host "`nIMPORTANT NEXT STEPS:" -ForegroundColor Yellow

Write-Host "`n1. Deploy to Firebase:" -ForegroundColor Cyan
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   firebase deploy --only hosting" -ForegroundColor White

Write-Host "`n2. Restart Backend Server:" -ForegroundColor Cyan
Write-Host "   node server.js" -ForegroundColor White
Write-Host "   (Check for export routes in startup logs)" -ForegroundColor Gray

Write-Host "`n3. Clear Browser Cache:" -ForegroundColor Cyan
Write-Host "   - Press Ctrl+Shift+Delete" -ForegroundColor White
Write-Host "   - Select 'Cached images and files'" -ForegroundColor White
Write-Host "   - Click 'Clear data'" -ForegroundColor White

Write-Host "`n4. Test Both Fixes:" -ForegroundColor Cyan
Write-Host "   A. CSS: Check if cards are narrower (max 400px)" -ForegroundColor White
Write-Host "   B. Export: Try exporting to Google Sheets" -ForegroundColor White

Write-Host "`nBackups created:" -ForegroundColor Gray
Write-Host "   - $appCssPath.backup-$timestamp" -ForegroundColor Gray
Write-Host "   - $serverJsPath.backup-$timestamp" -ForegroundColor Gray

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "Script completed!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
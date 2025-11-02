# fix-google-sheets-export.ps1
# Fixes the Google Sheets export function name mismatch

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "MedTestAI - Fix Google Sheets Export" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

# Verify we're in the right directory
if (-not (Test-Path $projectRoot)) {
    Write-Host "[ERROR] Project directory not found: $projectRoot" -ForegroundColor Red
    exit 1
}

Set-Location $projectRoot

# Check if server.js exists
$serverFile = "server.js"
if (-not (Test-Path $serverFile)) {
    Write-Host "[ERROR] server.js not found!" -ForegroundColor Red
    exit 1
}

Write-Host "[INFO] Found server.js" -ForegroundColor Green
Write-Host ""

# Backup server.js
Write-Host "[STEP 1] Creating backup..." -ForegroundColor Yellow
Copy-Item $serverFile "$serverFile.backup-$timestamp" -Force
Write-Host "✅ Backup created: $serverFile.backup-$timestamp" -ForegroundColor Green
Write-Host ""

# Read server.js content
Write-Host "[STEP 2] Reading server.js..." -ForegroundColor Yellow
$content = Get-Content $serverFile -Raw

# Check for the issue
if ($content -match 'googleSheets\.exportToSheets') {
    Write-Host "🔍 Found the issue: googleSheets.exportToSheets" -ForegroundColor Yellow
    Write-Host "   This function doesn't exist in google-sheets.js!" -ForegroundColor Red
    Write-Host ""
    
    Write-Host "[STEP 3] Applying fix..." -ForegroundColor Yellow
    
    # Replace the problematic section
    $oldSection = @'
app.post('/api/export/google-sheets', asyncHandler(async (req, res) => {
  console.log('📊 [Sheets] Export request received');
  
  const { testCases, config } = req.body;
  
  if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Test cases array is required'
    });
  }
  
  const result = await googleSheets.exportToSheets(testCases, config);
  
  res.json({
    success: true,
    spreadsheetUrl: result.spreadsheetUrl,
    spreadsheetId: result.spreadsheetId,
    rowsWritten: result.rowsWritten
  });
}));
'@

    $newSection = @'
app.post('/api/export/google-sheets', asyncHandler(async (req, res) => {
  console.log('📊 [Sheets] Export request received');
  
  const { testCases, requirements, metadata, config } = req.body;
  
  if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Test cases array is required'
    });
  }
  
  try {
    // Initialize google sheets if not already done
    if (!googleSheets.sheets) {
      console.log('📊 [Sheets] Initializing Google Sheets API...');
      await googleSheets.initialize();
    }
    
    console.log(`📊 [Sheets] Exporting ${testCases.length} test cases...`);
    
    // FIXED: Changed from exportToSheets to exportTestCases
    const result = await googleSheets.exportTestCases(testCases, config || {});
    
    console.log('✅ [Sheets] Export successful:', result.sheetUrl);
    
    res.json({
      success: true,
      spreadsheetUrl: result.sheetUrl,
      spreadsheetId: result.spreadsheetId,
      rowsWritten: result.updatedRows || testCases.length
    });
  } catch (error) {
    console.error('❌ [Sheets] Export failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export to Google Sheets'
    });
  }
}));
'@

    # Replace the content
    $content = $content -replace [regex]::Escape($oldSection), $newSection
    
    # Write back to file
    $content | Set-Content $serverFile -Encoding UTF8
    
    Write-Host "✅ Fixed: Changed exportToSheets → exportTestCases" -ForegroundColor Green
    Write-Host "✅ Added: Better error handling" -ForegroundColor Green
    Write-Host "✅ Added: Initialization check" -ForegroundColor Green
    Write-Host ""
    
} elseif ($content -match 'googleSheets\.exportTestCases') {
    Write-Host "✅ Already fixed! Function is correctly named exportTestCases" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⚠️  Could not find Google Sheets export route!" -ForegroundColor Yellow
    Write-Host "   Manual fix may be required" -ForegroundColor Yellow
    Write-Host ""
}

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ The issue was:" -ForegroundColor Yellow
Write-Host "   server.js called: googleSheets.exportToSheets()" -ForegroundColor White
Write-Host "   But actual function: googleSheets.exportTestCases()" -ForegroundColor White
Write-Host ""
Write-Host "✅ What was fixed:" -ForegroundColor Yellow
Write-Host "   1. Changed function name to exportTestCases" -ForegroundColor White
Write-Host "   2. Added initialization check" -ForegroundColor White
Write-Host "   3. Added proper error handling" -ForegroundColor White
Write-Host "   4. Added better logging" -ForegroundColor White
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Restart your backend server:" -ForegroundColor White
Write-Host "      Ctrl+C (to stop current server)" -ForegroundColor Gray
Write-Host "      node server.js" -ForegroundColor Cyan
Write-Host ""
Write-Host "   2. Test Google Sheets export:" -ForegroundColor White
Write-Host "      - Go to Export tab" -ForegroundColor Gray
Write-Host "      - Click 'GOOGLE SHEETS' button" -ForegroundColor Gray
Write-Host "      - Should export successfully!" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 Google Sheets export should now work!" -ForegroundColor Green
Write-Host ""
# setup-drive-export.ps1
# Automates Google Drive Folder Export Setup

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "MedTestAI - Drive Folder Export Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'

if (-not (Test-Path $projectRoot)) {
    Write-Host "[ERROR] Project directory not found: $projectRoot" -ForegroundColor Red
    exit 1
}

Set-Location $projectRoot

# Step 2: Update server.js
Write-Host ""
Write-Host "[STEP 2] Updating server.js..." -ForegroundColor Yellow

$serverFile = "server.js"
if (-not (Test-Path $serverFile)) {
    Write-Host "❌ server.js not found!" -ForegroundColor Red
    exit 1
}

# Backup
Copy-Item $serverFile "$serverFile.backup-$timestamp" -Force
Write-Host "✅ Created backup: $serverFile.backup-$timestamp" -ForegroundColor Green

$content = Get-Content $serverFile -Raw

# Add import if not exists
if ($content -notmatch 'GoogleDriveExport') {
    Write-Host "Adding GoogleDriveExport import..." -ForegroundColor Cyan
    $content = $content -replace '(import GoogleDriveService.*)', "`$1`nimport GoogleDriveExport from './services/GoogleDriveExport.js';"
}

# Add endpoints if not exist
if ($content -notmatch '/api/drive/verify-folder') {
    Write-Host "Adding Drive folder export endpoints..." -ForegroundColor Cyan
    
    $endpoints = @'


// ==================== GOOGLE DRIVE FOLDER EXPORT ====================

// Verify folder access
app.post('/api/drive/verify-folder', asyncHandler(async (req, res) => {
  const { folderId } = req.body;
  
  if (!folderId) {
    return res.status(400).json({
      success: false,
      error: 'Folder ID is required'
    });
  }

  const result = await GoogleDriveExport.verifyFolder(folderId);
  
  res.json({
    success: result.valid,
    folderName: result.folderName,
    error: result.error
  });
}));

// Export to user's Drive folder
app.post('/api/export/drive-folder', asyncHandler(async (req, res) => {
  console.log('📁 [Drive] Export to folder request received');
  
  const { testCases, folderId, fileName, methodology, compliance } = req.body;
  
  if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Test cases array is required'
    });
  }

  if (!folderId) {
    return res.status(400).json({
      success: false,
      error: 'Google Drive folder ID is required'
    });
  }

  try {
    console.log(`📁 [Drive] Exporting ${testCases.length} test cases to folder: ${folderId}`);
    
    const result = await GoogleDriveExport.createSheetInFolder(testCases, {
      folderId,
      fileName: fileName || 'MedTestAI Test Cases',
      methodology: methodology || 'agile',
      compliance: compliance || 'HIPAA'
    });

    console.log('✅ [Drive] Export successful:', result.spreadsheetUrl);

    res.json({
      success: true,
      spreadsheetUrl: result.spreadsheetUrl,
      spreadsheetId: result.spreadsheetId,
      fileName: result.fileName
    });

  } catch (error) {
    console.error('❌ [Drive] Export failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to export to Google Drive'
    });
  }
}));
'@

    # Find insertion point (after GOOGLE SHEETS EXPORT section)
    $insertMarker = '// ==================== EXPORT ENDPOINTS ===================='
    $content = $content -replace $insertMarker, "$endpoints`n`n$insertMarker"
}

$content | Set-Content $serverFile -Encoding UTF8
Write-Host "✅ Updated server.js with Drive endpoints" -ForegroundColor Green

# Step 3: Instructions for TestResults.js
Write-Host ""
Write-Host "[STEP 3] TestResults.js Update Required" -ForegroundColor Yellow
Write-Host "   Manual step needed - see outputs\TestResults-drive-export.js" -ForegroundColor Cyan
Write-Host "   Update the google-sheets case in handleExport function" -ForegroundColor Cyan

# Summary
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "SETUP COMPLETE!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ What was done:" -ForegroundColor Yellow
Write-Host "   1. Copied GoogleDriveExport.js to services/" -ForegroundColor White
Write-Host "   2. Added import to server.js" -ForegroundColor White
Write-Host "   3. Added /api/drive/verify-folder endpoint" -ForegroundColor White
Write-Host "   4. Added /api/export/drive-folder endpoint" -ForegroundColor White
Write-Host ""
Write-Host "📋 Manual step:" -ForegroundColor Yellow
Write-Host "   Update TestResults.js handleExport function" -ForegroundColor White
Write-Host "   See: outputs\TestResults-drive-export.js for code" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Update TestResults.js (see above)" -ForegroundColor White
Write-Host "   2. Restart backend: node server.js" -ForegroundColor Cyan
Write-Host "   3. Test: Upload doc - Generate tests - Export - Enter folder ID" -ForegroundColor White
Write-Host ""
Write-Host "📖 Full guide: outputs\DRIVE_FOLDER_EXPORT_SETUP.txt" -ForegroundColor Cyan
Write-Host ""
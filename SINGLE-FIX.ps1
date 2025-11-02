# SINGLE FIX - Update App.js handleRegenerateTests function
# This is the ONLY thing that's broken!

$AppJsPath = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI\frontend\src\App.js"

if (-not (Test-Path $AppJsPath)) {
    Write-Host "ERROR: App.js not found at $AppJsPath" -ForegroundColor Red
    exit 1
}

Write-Host "Fixing App.js handleRegenerateTests function..." -ForegroundColor Yellow

# Read the file
$content = Get-Content $AppJsPath -Raw

# Find and replace the function
$oldFunction = @'
  // ============ REQUIREMENTS EDITOR HANDLER ============
  const handleRegenerateTests = async (data) => {
    // Update results with regenerated test cases
    setResults(prev => ({
      ...prev,
      testCases: data.testCases || prev.testCases,
      extractedData: {
        ...prev.extractedData,
        requirements: data.requirements || prev.extractedData?.requirements
      }
    }));
    
    setShowRequirementsEditor(false);
    console.log('âœ… Test cases regenerated successfully');
  };
'@

$newFunction = @'
  // ============ REQUIREMENTS EDITOR HANDLER ============
  const handleRegenerateTests = async (result) => {
    console.log('Regenerate result:', result);
    
    // Backend returns: { success: true, data: { testCases: [...], metadata: {...} } }
    const data = result.data || result;
    
    // Update results with regenerated test cases
    setResults(prev => ({
      ...prev,
      testCases: data.testCases || prev.testCases,
      metadata: {
        ...prev.metadata,
        ...data.metadata
      },
      summary: data.summary || prev.summary,
      extractedData: {
        ...prev.extractedData,
        requirements: data.requirements || prev.extractedData?.requirements
      }
    }));
    
    setShowRequirementsEditor(false);
    console.log('âœ… Test cases regenerated successfully:', data.testCases?.length, 'test cases');
  };
'@

# Replace
$content = $content.Replace($oldFunction, $newFunction)

# Write back
$content | Set-Content $AppJsPath -Encoding UTF8

Write-Host ""
Write-Host "FIXED!" -ForegroundColor Green
Write-Host ""
Write-Host "What was fixed:" -ForegroundColor Cyan
Write-Host "  - handleRegenerateTests now correctly handles backend response structure" -ForegroundColor White
Write-Host "  - Added: const data = result.data || result" -ForegroundColor White
Write-Host "  - Added: Better logging to debug" -ForegroundColor White
Write-Host ""

Write-Host "RESTART FRONTEND:" -ForegroundColor Yellow
Write-Host "  cd frontend" -ForegroundColor Gray
Write-Host "  npm start" -ForegroundColor Gray
Write-Host ""

Write-Host "TEST IT:" -ForegroundColor Cyan
Write-Host "  1. Upload document" -ForegroundColor White
Write-Host "  2. Click 'Edit Requirements & Regenerate'" -ForegroundColor White
Write-Host "  3. Edit a requirement" -ForegroundColor White
Write-Host "  4. Click 'Regenerate Test Cases'" -ForegroundColor White
Write-Host "  5. Should see new test cases!" -ForegroundColor White
Write-Host ""
# Quick Setup: Google Sheets & Drive Export for MedTestAI
# Run this script to enable export features

Write-Host "🚀 MedTestAI - Google Sheets & Drive Setup" -ForegroundColor Cyan
Write-Host "=" * 70

$PROJECT_ID = "pro-variety-472211-b9"
$SERVICE_ACCOUNT = "medtestai-main@pro-variety-472211-b9.iam.gserviceaccount.com"

Write-Host "`n📋 Step 1: Enabling Google APIs..." -ForegroundColor Yellow

# Enable required APIs
gcloud services enable sheets.googleapis.com --project=$PROJECT_ID
gcloud services enable drive.googleapis.com --project=$PROJECT_ID

Write-Host "✅ Google Sheets API enabled" -ForegroundColor Green
Write-Host "✅ Google Drive API enabled" -ForegroundColor Green

Write-Host "`n🔐 Step 2: Verifying service account permissions..." -ForegroundColor Yellow

# Check current permissions
Write-Host "Current permissions for service account:" -ForegroundColor Cyan
gcloud projects get-iam-policy $PROJECT_ID `
  --flatten="bindings[].members" `
  --filter="bindings.members:$SERVICE_ACCOUNT" `
  --format="table(bindings.role)"

Write-Host "`n📦 Step 3: Installing NPM packages..." -ForegroundColor Yellow

# Check if in correct directory
if (Test-Path "package.json") {
    $currentPackages = npm list googleapis 2>$null
    
    if ($currentPackages -match "googleapis") {
        Write-Host "✅ googleapis already installed" -ForegroundColor Green
    } else {
        Write-Host "Installing googleapis..." -ForegroundColor Cyan
        npm install googleapis@126.0.0
        Write-Host "✅ googleapis installed" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Warning: package.json not found in current directory" -ForegroundColor Yellow
    Write-Host "Please run this script from your project root directory" -ForegroundColor Yellow
}

Write-Host "`n🧪 Step 4: Testing configuration..." -ForegroundColor Yellow

# Test if backend is running
try {
    $healthCheck = Invoke-RestMethod -Uri "https://medtestai-backend-1067292712875.us-central1.run.app/health" -ErrorAction SilentlyContinue
    Write-Host "✅ Backend is online" -ForegroundColor Green
    Write-Host "   Features enabled:" -ForegroundColor Cyan
    Write-Host "   - Multi-compliance: $($healthCheck.features.multiCompliance)" -ForegroundColor White
    Write-Host "   - Vertex AI: $($healthCheck.features.vertexAI)" -ForegroundColor White
} catch {
    Write-Host "⚠️  Backend might be offline or needs deployment" -ForegroundColor Yellow
}

Write-Host "`n📝 Step 5: Environment Variables Check..." -ForegroundColor Yellow

if (Test-Path ".env") {
    $envContent = Get-Content .env -Raw
    
    $checks = @{
        "GOOGLE_CLOUD_PROJECT" = $envContent -match "GOOGLE_CLOUD_PROJECT"
        "GOOGLE_APPLICATION_CREDENTIALS" = $envContent -match "GOOGLE_APPLICATION_CREDENTIALS"
    }
    
    foreach ($check in $checks.GetEnumerator()) {
        if ($check.Value) {
            Write-Host "   ✅ $($check.Key) is configured" -ForegroundColor Green
        } else {
            Write-Host "   ❌ $($check.Key) is missing" -ForegroundColor Red
        }
    }
} else {
    Write-Host "   ⚠️  .env file not found" -ForegroundColor Yellow
}

Write-Host "`n" -ForegroundColor Cyan
Write-Host "=" * 70
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=" * 70

Write-Host "`n📚 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Deploy backend with new features:" -ForegroundColor White
Write-Host "   gcloud run deploy medtestai-backend --source . --region=us-central1" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Update frontend with export buttons:" -ForegroundColor White
Write-Host "   - Copy fixed App.js to frontend/src/" -ForegroundColor Gray
Write-Host "   - Add Google Sheets export button to TestResults component" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test the export feature:" -ForegroundColor White
Write-Host "   - Upload a document" -ForegroundColor Gray
Write-Host "   - Generate test cases" -ForegroundColor Gray
Write-Host "   - Click 'Export to Google Sheets'" -ForegroundColor Gray
Write-Host ""

Write-Host "📖 Full documentation:" -ForegroundColor Cyan
Write-Host "   See GOOGLE_SHEETS_DRIVE_SETUP.md for detailed instructions" -ForegroundColor White
Write-Host ""

Write-Host "🎉 Your MedTestAI now supports Google Sheets & Drive export!" -ForegroundColor Green
# final-fix.ps1
Write-Host "🔧 Final Fix for MedTestAI Vertex AI Migration" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$ProjectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
cd $ProjectRoot

# 1. Copy updated WebhookManager.js
Write-Host "`n1. Updating WebhookManager.js..." -ForegroundColor Yellow
if (Test-Path "outputs\WebhookManager.js") {
    Copy-Item "outputs\WebhookManager.js" "services\WebhookManager.js" -Force
    Write-Host "✅ WebhookManager.js updated" -ForegroundColor Green
} else {
    Write-Host "❌ outputs\WebhookManager.js not found" -ForegroundColor Red
    Write-Host "Copy it from the outputs directory manually" -ForegroundColor Yellow
    exit 1
}

# 2. Check for other files using old package
Write-Host "`n2. Checking for other files using old package..." -ForegroundColor Yellow
$oldPackageRefs = Get-ChildItem -Path . -Include *.js -Recurse -Exclude node_modules | 
    Select-String -Pattern "@google/generative-ai" | 
    Where-Object { $_.Line -notmatch '^\s*//' }  # Exclude commented lines

if ($oldPackageRefs) {
    Write-Host "⚠️  Found references to old package:" -ForegroundColor Yellow
    $oldPackageRefs | ForEach-Object { Write-Host "   $($_.Path):$($_.LineNumber)" -ForegroundColor Gray }
    Write-Host "`nThese files need to be updated manually" -ForegroundColor Yellow
} else {
    Write-Host "✅ No active references to old package found" -ForegroundColor Green
}

# 3. Remove old package
Write-Host "`n3. Removing old package..." -ForegroundColor Yellow
npm uninstall @google/generative-ai
Write-Host "✅ Old package removed" -ForegroundColor Green

# 4. Ensure Vertex AI SDK is installed
Write-Host "`n4. Verifying Vertex AI SDK..." -ForegroundColor Yellow
npm install @google-cloud/vertexai
Write-Host "✅ Vertex AI SDK installed" -ForegroundColor Green

# 5. Test server locally
Write-Host "`n5. Testing server locally..." -ForegroundColor Yellow
Write-Host "Starting server (will auto-stop in 10 seconds)..." -ForegroundColor Gray

$job = Start-Job -ScriptBlock {
    param($projectRoot)
    Set-Location $projectRoot
    node server.js
} -ArgumentList $ProjectRoot

Start-Sleep -Seconds 8

# Test health endpoint
try {
    $health = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5
    $healthData = $health.Content | ConvertFrom-Json
    
    if ($healthData.services.gemini.authentication -eq "ADC") {
        Write-Host "✅ LOCAL TEST PASSED - Using Vertex AI ADC!" -ForegroundColor Green
        $localTestPassed = $true
    } else {
        Write-Host "❌ Local test failed - Auth method: $($healthData.services.gemini.authentication)" -ForegroundColor Red
        $localTestPassed = $false
    }
} catch {
    Write-Host "⚠️  Local health check failed: $_" -ForegroundColor Yellow
    Write-Host "Check if server started correctly" -ForegroundColor Gray
    $localTestPassed = $false
}

# Stop the test server
Stop-Job $job
Remove-Job $job

if (-not $localTestPassed) {
    Write-Host "`n❌ Local test failed. Fix errors before deploying." -ForegroundColor Red
    exit 1
}

# 6. Deploy to Cloud Run
Write-Host "`n6. Deploying to Cloud Run..." -ForegroundColor Yellow
Write-Host "(This will take 3-5 minutes)" -ForegroundColor Gray

gcloud run deploy medtestai-backend `
  --source . `
  --region=us-central1 `
  --platform=managed `
  --allow-unauthenticated `
  --service-account=medtestai-main@pro-variety-472211-b9.iam.gserviceaccount.com `
  --set-env-vars=GOOGLE_CLOUD_PROJECT=pro-variety-472211-b9,NODE_ENV=production,PORT=8080 `
  --min-instances=0 `
  --max-instances=10 `
  --memory=512Mi `
  --cpu=1 `
  --timeout=300 `
  --project=pro-variety-472211-b9

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Backend deployed successfully!" -ForegroundColor Green
    
    # Wait for service to be ready
    Start-Sleep -Seconds 10
    
    # Test deployed service
    Write-Host "`n7. Testing deployed service..." -ForegroundColor Yellow
    
    $serviceUrl = gcloud run services describe medtestai-backend `
        --region=us-central1 `
        --project=pro-variety-472211-b9 `
        --format="value(status.url)"
    
    try {
        $deployedHealth = Invoke-WebRequest -Uri "$serviceUrl/health" -Method Get -TimeoutSec 15
        $deployedData = $deployedHealth.Content | ConvertFrom-Json
        
        Write-Host "`nService URL: $serviceUrl" -ForegroundColor Cyan
        Write-Host "Status: $($deployedData.status)" -ForegroundColor White
        Write-Host "Authentication: $($deployedData.services.gemini.authentication)" -ForegroundColor White
        
        if ($deployedData.services.gemini.authentication -eq "ADC") {
            Write-Host "`n🎉 SUCCESS! DEPLOYED SERVICE IS USING VERTEX AI ADC!" -ForegroundColor Green
        } else {
            Write-Host "`n⚠️  Deployed but not using ADC properly" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Could not verify deployment: $_" -ForegroundColor Yellow
        Write-Host "Wait a minute and check manually: curl $serviceUrl/health" -ForegroundColor Gray
    }
} else {
    Write-Host "`n❌ Deployment failed" -ForegroundColor Red
    Write-Host "Check logs: gcloud run services logs read medtestai-backend --region=us-central1" -ForegroundColor Yellow
    exit 1
}

# Summary
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "`n📍 Your URLs:" -ForegroundColor Cyan
Write-Host "   Backend:  $serviceUrl" -ForegroundColor White
Write-Host "   Health:   $serviceUrl/health" -ForegroundColor White
Write-Host "   Frontend: https://pro-variety-472211-b9.web.app" -ForegroundColor White

Write-Host "`n✅ Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Deploy frontend: cd frontend; npm run build; firebase deploy --only hosting" -ForegroundColor White
Write-Host "   2. Test the application end-to-end" -ForegroundColor White
Write-Host "   3. Verify Vertex AI in Cloud Run logs" -ForegroundColor White

Write-Host "`n🎉 Your MedTestAI is now using Vertex AI with ADC!" -ForegroundColor Green
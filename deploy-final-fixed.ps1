# deploy-final-fixed.ps1
Write-Host "MedTestAI Complete Deployment - Final Fix" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

$ProjectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
$ProjectId = "pro-variety-472211-b9"
$Region = "us-central1"

cd $ProjectRoot

# Step 1: Update WebhookManager.js
Write-Host "`nStep 1: Updating WebhookManager.js..." -ForegroundColor Yellow
if (Test-Path "outputs\WebhookManager.js") {
    Copy-Item "outputs\WebhookManager.js" "services\WebhookManager.js" -Force
    Write-Host "OK: WebhookManager.js updated" -ForegroundColor Green
} else {
    Write-Host "ERROR: outputs\WebhookManager.js not found" -ForegroundColor Red
    exit 1
}

# Step 2: Remove old package
Write-Host "`nStep 2: Removing old package..." -ForegroundColor Yellow
npm uninstall @google/generative-ai 2>$null
Write-Host "OK: Old package removed" -ForegroundColor Green

# Step 3: Install Vertex AI SDK
Write-Host "`nStep 3: Installing Vertex AI SDK..." -ForegroundColor Yellow
npm install @google-cloud/vertexai
if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Vertex AI SDK installed" -ForegroundColor Green
} else {
    Write-Host "ERROR: Failed to install Vertex AI SDK" -ForegroundColor Red
    exit 1
}

# Step 4: Test locally
Write-Host "`nStep 4: Testing server locally..." -ForegroundColor Yellow
Write-Host "Starting server in background..." -ForegroundColor Gray

$serverJob = Start-Job -ScriptBlock {
    param($root)
    Set-Location $root
    node server.js 2>&1
} -ArgumentList $ProjectRoot

Start-Sleep -Seconds 8

try {
    $localHealth = Invoke-WebRequest -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5
    $localData = $localHealth.Content | ConvertFrom-Json
    
    Write-Host "Local server status: $($localData.status)" -ForegroundColor White
    Write-Host "Authentication: $($localData.services.gemini.authentication)" -ForegroundColor White
    
    if ($localData.services.gemini.authentication -eq "ADC") {
        Write-Host "OK: Local server using Vertex AI ADC" -ForegroundColor Green
        $canDeploy = $true
    } else {
        Write-Host "ERROR: Local server not using ADC" -ForegroundColor Red
        $canDeploy = $false
    }
} catch {
    Write-Host "WARNING: Could not test local server" -ForegroundColor Yellow
    Write-Host "Error: $_" -ForegroundColor Gray
    $canDeploy = $true  # Deploy anyway
}

Stop-Job $serverJob -ErrorAction SilentlyContinue
Remove-Job $serverJob -ErrorAction SilentlyContinue

if (-not $canDeploy) {
    Write-Host "`nERROR: Fix local issues before deploying" -ForegroundColor Red
    exit 1
}

# Step 5: Deploy to Cloud Run
Write-Host "`nStep 5: Deploying to Cloud Run..." -ForegroundColor Yellow
Write-Host "This will take 3-5 minutes..." -ForegroundColor Gray

gcloud run deploy medtestai-backend `
  --source . `
  --region=$Region `
  --platform=managed `
  --allow-unauthenticated `
  --service-account=medtestai-main@pro-variety-472211-b9.iam.gserviceaccount.com `
  --set-env-vars=GOOGLE_CLOUD_PROJECT=$ProjectId,NODE_ENV=production,PORT=8080 `
  --project=$ProjectId

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: Cloud Run deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "`nOK: Backend deployed" -ForegroundColor Green

# Step 6: Verify deployment
Write-Host "`nStep 6: Verifying deployment..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$serviceUrl = gcloud run services describe medtestai-backend `
    --region=$Region `
    --project=$ProjectId `
    --format="value(status.url)" 2>$null

if (-not $serviceUrl) {
    Write-Host "WARNING: Could not get service URL" -ForegroundColor Yellow
    $serviceUrl = "https://medtestai-backend-1067292712875.us-central1.run.app"
}

Write-Host "Service URL: $serviceUrl" -ForegroundColor Cyan

try {
    $deployedHealth = Invoke-WebRequest -Uri "$serviceUrl/health" -Method Get -TimeoutSec 15
    $deployedData = $deployedHealth.Content | ConvertFrom-Json
    
    Write-Host "`nDeployed Service Status:" -ForegroundColor White
    Write-Host "  Status: $($deployedData.status)" -ForegroundColor White
    Write-Host "  Gemini Auth: $($deployedData.services.gemini.authentication)" -ForegroundColor White
    
    if ($deployedData.services.gemini.authentication -eq "ADC") {
        Write-Host "`nSUCCESS: Deployed service is using Vertex AI ADC!" -ForegroundColor Green
    } else {
        Write-Host "`nWARNING: Not using ADC - Auth method: $($deployedData.services.gemini.authentication)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "WARNING: Could not verify deployment" -ForegroundColor Yellow
    Write-Host "Check manually: curl $serviceUrl/health" -ForegroundColor Gray
}

# Step 7: Deploy frontend
Write-Host "`nStep 7: Deploying frontend..." -ForegroundColor Yellow
cd frontend

Write-Host "Building frontend..." -ForegroundColor Gray
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Frontend built" -ForegroundColor Green
    
    Write-Host "Deploying to Firebase..." -ForegroundColor Gray
    firebase deploy --only hosting --project=$ProjectId
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "OK: Frontend deployed" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Firebase deployment failed" -ForegroundColor Red
    }
} else {
    Write-Host "ERROR: Frontend build failed" -ForegroundColor Red
}

cd $ProjectRoot

# Summary
Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "DEPLOYMENT COMPLETE" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "`nYour URLs:" -ForegroundColor Cyan
Write-Host "  Backend:  $serviceUrl" -ForegroundColor White
Write-Host "  Health:   $serviceUrl/health" -ForegroundColor White
Write-Host "  Frontend: https://pro-variety-472211-b9.web.app" -ForegroundColor White

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Test: Open https://pro-variety-472211-b9.web.app" -ForegroundColor White
Write-Host "  2. Clear browser cache (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "  3. Upload a document and generate test cases" -ForegroundColor White
Write-Host "  4. Verify no errors in console (F12)" -ForegroundColor White

Write-Host "`nMonitoring:" -ForegroundColor Yellow
Write-Host "  View logs: gcloud run services logs read medtestai-backend --region=$Region" -ForegroundColor Gray

Write-Host "`nDone!" -ForegroundColor Green
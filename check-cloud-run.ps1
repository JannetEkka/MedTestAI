# Check Cloud Run Deployment and Logs
# Run this in PowerShell to diagnose the issue

Write-Host "🔍 MedTestAI Cloud Run Diagnostics" -ForegroundColor Cyan
Write-Host "=" * 60

# 1. Check if service is deployed
Write-Host "`n📦 Checking deployment status..." -ForegroundColor Yellow
gcloud run services describe medtestai-backend `
  --region=us-central1 `
  --project=pro-variety-472211-b9 `
  --format="value(status.url,status.conditions)"

# 2. Get latest logs
Write-Host "`n📋 Fetching latest logs (last 50 lines)..." -ForegroundColor Yellow
gcloud run services logs read medtestai-backend `
  --region=us-central1 `
  --project=pro-variety-472211-b9 `
  --limit=50

# 3. Check environment variables
Write-Host "`n🔧 Checking environment variables..." -ForegroundColor Yellow
gcloud run services describe medtestai-backend `
  --region=us-central1 `
  --project=pro-variety-472211-b9 `
  --format="value(spec.template.spec.containers[0].env)"

# 4. Check service account
Write-Host "`n👤 Checking service account..." -ForegroundColor Yellow
gcloud run services describe medtestai-backend `
  --region=us-central1 `
  --project=pro-variety-472211-b9 `
  --format="value(spec.template.spec.serviceAccountName)"

Write-Host "`n" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host "Diagnostics complete!" -ForegroundColor Green
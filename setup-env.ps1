# MedTestAI Environment Setup
Write-Host "🏥 Setting up MedTestAI Environment..." -ForegroundColor Green

# Set GCP project
gcloud config set project pro-variety-472211-b9

# Verify authentication
$auth = gcloud auth list --filter=status:ACTIVE --format="value(account)"
if (-not $auth) {
    Write-Host "⚠️  Not authenticated. Logging in..." -ForegroundColor Yellow
    gcloud auth login
    gcloud auth application-default login
}

# Set environment variables
$env:GOOGLE_CLOUD_PROJECT = "pro-variety-472211-b9"
$env:GCLOUD_PROJECT = "pro-variety-472211-b9"

# Navigate to project directory
Set-Location "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"

Write-Host "✅ Environment configured!" -ForegroundColor Green
Write-Host "   Project: pro-variety-472211-b9" -ForegroundColor Cyan
Write-Host "   Backend URL: https://medtestai-backend-1067292712875.us-central1.run.app" -ForegroundColor Cyan
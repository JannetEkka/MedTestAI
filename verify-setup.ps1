# verify-setup.ps1
Write-Host "🔍 MedTestAI Setup Verification" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check current account
$account = gcloud config get-value account 2>$null
Write-Host "Current Account: $account"

$project = gcloud config get-value project 2>$null
Write-Host "Current Project: $project"
Write-Host ""

# Check if using correct account
if ($account -ne "jannetfornewstuff@gmail.com") {
    Write-Host "❌ Wrong account! Should be jannetfornewstuff@gmail.com" -ForegroundColor Red
    Write-Host "Run: gcloud config set account jannetfornewstuff@gmail.com" -ForegroundColor Yellow
} else {
    Write-Host "✅ Correct account" -ForegroundColor Green
}

# Check services
Write-Host "`n📊 Service Status:" -ForegroundColor Cyan
$services = @("aiplatform", "documentai", "healthcare", "storage-api", "generativelanguage")

foreach ($service in $services) {
    $result = gcloud services list --enabled --filter="name:${service}.googleapis.com" --format="value(name)" 2>$null
    if ($result -like "*$service*") {
        Write-Host "  ✅ ${service}: Enabled" -ForegroundColor Green
    } else {
        Write-Host "  ❌ ${service}: Not enabled" -ForegroundColor Red
    }
}

# Check files
if (Test-Path ".\medtestai-sa-key.json") {
    Write-Host "`n✅ Service account key found" -ForegroundColor Green
} else {
    Write-Host "`n❌ Service account key missing" -ForegroundColor Red
}

if (Test-Path ".\.env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
} else {
    Write-Host "❌ .env file missing" -ForegroundColor Red
}
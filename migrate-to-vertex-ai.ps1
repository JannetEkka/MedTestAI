# migrate-to-vertex-ai.ps1
# MedTestAI Vertex AI Migration Script
# Migrates from Gemini API Key to Vertex AI SDK with Application Default Credentials

Write-Host "🚀 MedTestAI Vertex AI Migration Script" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

$ProjectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
$BackupDir = "$ProjectRoot\backups\vertex-ai-migration-$(Get-Date -Format 'yyyy-MM-dd-HHmmss')"

# Check if we're in the right directory
if (-not (Test-Path $ProjectRoot)) {
    Write-Host "❌ ERROR: Project directory not found: $ProjectRoot" -ForegroundColor Red
    Write-Host "Please update the script with your correct project path" -ForegroundColor Yellow
    exit 1
}

Set-Location $ProjectRoot

Write-Host "`n📦 Step 1: Installing Vertex AI SDK..." -ForegroundColor Yellow
npm install @google-cloud/vertexai
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install Vertex AI SDK" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Vertex AI SDK installed successfully" -ForegroundColor Green

Write-Host "`n💾 Step 2: Creating backups..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

$FilesToBackup = @(
    ".env",
    "auth\googleAuth.js",
    "services\geminiService.js",
    "services\testCaseGeneratorMultiCompliance.js",
    "services\GapAnalysisService.js",
    "routes\health.routes.js"
)

foreach ($file in $FilesToBackup) {
    $sourcePath = Join-Path $ProjectRoot $file
    if (Test-Path $sourcePath) {
        $destPath = Join-Path $BackupDir $file
        $destDir = Split-Path $destPath -Parent
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        Copy-Item $sourcePath $destPath -Force
        Write-Host "  ✓ Backed up: $file" -ForegroundColor Gray
    } else {
        Write-Host "  ⚠ File not found (skipping): $file" -ForegroundColor Yellow
    }
}
Write-Host "✅ Backups created in: $BackupDir" -ForegroundColor Green

Write-Host "`n🔧 Step 3: Updating .env file..." -ForegroundColor Yellow
$envPath = Join-Path $ProjectRoot ".env"
if (Test-Path $envPath) {
    $envContent = Get-Content $envPath -Raw
    
    # Remove GEMINI_API_KEY line
    $envContent = $envContent -replace '(?m)^GEMINI_API_KEY=.*$\r?\n?', ''
    
    # Ensure required variables are present
    if ($envContent -notmatch 'GOOGLE_CLOUD_PROJECT=') {
        $envContent += "`nGOOGLE_CLOUD_PROJECT=pro-variety-472211-b9"
    }
    if ($envContent -notmatch 'GOOGLE_APPLICATION_CREDENTIALS=') {
        $envContent += "`nGOOGLE_APPLICATION_CREDENTIALS=./medtestai-sa-key.json"
    }
    
    # Save updated .env
    $envContent | Set-Content $envPath -NoNewline
    Write-Host "✅ .env file updated (GEMINI_API_KEY removed)" -ForegroundColor Green
} else {
    Write-Host "⚠ .env file not found" -ForegroundColor Yellow
}

Write-Host "`n📝 Step 4: Please manually copy the updated files..." -ForegroundColor Yellow
Write-Host @"

The following files need to be copied from your outputs directory:

1. auth\googleAuth.js
2. services\geminiService.js
3. services\testCaseGeneratorMultiCompliance.js
4. services\GapAnalysisService.js
5. routes\health.routes.js

Or you can copy them from the backups if you have the updated versions.
"@ -ForegroundColor White

Write-Host "`n✅ Step 5: Verify Google Cloud Authentication..." -ForegroundColor Yellow
Write-Host "Running: gcloud auth application-default login" -ForegroundColor Gray
Write-Host "This will authenticate your local environment with Google Cloud..." -ForegroundColor Gray

$response = Read-Host "`nDo you want to run the authentication command now? (Y/N)"
if ($response -eq 'Y' -or $response -eq 'y') {
    gcloud auth application-default login
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Authentication successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Authentication failed" -ForegroundColor Red
    }
} else {
    Write-Host "⚠ Skipped authentication. Run 'gcloud auth application-default login' manually" -ForegroundColor Yellow
}

Write-Host "`n🔍 Step 6: Verifying setup..." -ForegroundColor Yellow

# Check if service account key exists
if (Test-Path "$ProjectRoot\medtestai-sa-key.json") {
    Write-Host "✅ Service account key found" -ForegroundColor Green
} else {
    Write-Host "❌ Service account key not found" -ForegroundColor Red
}

# Check if Vertex AI SDK is installed
$packageJson = Get-Content "$ProjectRoot\package.json" -Raw | ConvertFrom-Json
if ($packageJson.dependencies.'@google-cloud/vertexai') {
    Write-Host "✅ Vertex AI SDK installed: $($packageJson.dependencies.'@google-cloud/vertexai')" -ForegroundColor Green
} else {
    Write-Host "❌ Vertex AI SDK not found in package.json" -ForegroundColor Red
}

# Check gcloud configuration
Write-Host "`n📋 Current gcloud configuration:" -ForegroundColor Cyan
$gconfigAccount = gcloud config get-value account 2>$null
$gconfigProject = gcloud config get-value project 2>$null
Write-Host "  Account: $gconfigAccount"
Write-Host "  Project: $gconfigProject"

if ($gconfigProject -ne "pro-variety-472211-b9") {
    Write-Host "⚠ WARNING: Project is not set to pro-variety-472211-b9" -ForegroundColor Yellow
    Write-Host "  Run: gcloud config set project pro-variety-472211-b9" -ForegroundColor Gray
}

Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "📌 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host @"

1. ✅ DONE: Installed Vertex AI SDK
2. ✅ DONE: Created backups
3. ✅ DONE: Updated .env file
4. ⏳ TODO: Copy updated files from outputs directory:
   - auth\googleAuth.js
   - services\geminiService.js
   - services\testCaseGeneratorMultiCompliance.js
   - services\GapAnalysisService.js
   - routes\health.routes.js

5. ⏳ TODO: Test the migration:
   - Run: node server.js
   - Check: http://localhost:3001/health
   - Verify: Should show Vertex AI authentication

6. ⏳ TODO: Enable required APIs (if not already enabled):
   gcloud services enable aiplatform.googleapis.com
   gcloud services enable documentai.googleapis.com
   gcloud services enable healthcare.googleapis.com

7. ⏳ TODO: Deploy to Cloud Run (when ready):
   gcloud run deploy medtestai-backend \
     --source . \
     --region us-central1 \
     --allow-unauthenticated \
     --service-account medtestai-main@pro-variety-472211-b9.iam.gserviceaccount.com

"@ -ForegroundColor White

Write-Host "📁 Backups saved to: $BackupDir" -ForegroundColor Cyan
Write-Host "`n✨ Migration preparation complete!" -ForegroundColor Green
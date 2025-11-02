#!/usr/bin/env pwsh
# Script: fix-document-ai-config.ps1
# Purpose: Verify and fix Document AI configuration
# Project: MedTestAI (pro-variety-472211-b9)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MedTestAI - Document AI Fix Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Project configuration
$PROJECT_ID = "pro-variety-472211-b9"
$LOCATION = "us"
$PROCESSOR_ID = "c1ed1597820769df"

Write-Host "✓ Configuration:" -ForegroundColor Green
Write-Host "  Project ID: $PROJECT_ID"
Write-Host "  Location: $LOCATION"  
Write-Host "  Processor ID: $PROCESSOR_ID"
Write-Host ""

# Step 1: Verify gcloud is authenticated
Write-Host "Step 1: Verifying gcloud authentication..." -ForegroundColor Yellow
try {
    $account = gcloud auth list --filter="status:ACTIVE" --format="value(account)" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Authenticated as: $account" -ForegroundColor Green
    } else {
        throw "Not authenticated"
    }
} catch {
    Write-Host "✗ Not authenticated to gcloud" -ForegroundColor Red
    Write-Host "  Run: gcloud auth login" -ForegroundColor Yellow
    exit 1
}

# Step 2: Set active project
Write-Host ""
Write-Host "Step 2: Setting active project..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Project set to $PROJECT_ID" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to set project" -ForegroundColor Red
    exit 1
}

# Step 3: Check if Document AI API is enabled
Write-Host ""
Write-Host "Step 3: Checking Document AI API status..." -ForegroundColor Yellow
$apiEnabled = gcloud services list --enabled --filter="name:documentai.googleapis.com" --format="value(name)" 2>&1
if ($apiEnabled -match "documentai.googleapis.com") {
    Write-Host "✓ Document AI API is enabled" -ForegroundColor Green
} else {
    Write-Host "✗ Document AI API is NOT enabled" -ForegroundColor Red
    Write-Host "  Enabling Document AI API..." -ForegroundColor Yellow
    gcloud services enable documentai.googleapis.com
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Document AI API enabled" -ForegroundColor Green
        Start-Sleep -Seconds 5  # Wait for API to propagate
    } else {
        Write-Host "✗ Failed to enable API" -ForegroundColor Red
        exit 1
    }
}

# Step 4: List available processors
Write-Host ""
Write-Host "Step 4: Listing Document AI processors..." -ForegroundColor Yellow
Write-Host "  Making API call..." -ForegroundColor Gray

$token = gcloud auth print-access-token
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "https://us-documentai.googleapis.com/v1/projects/$PROJECT_ID/locations/$LOCATION/processors" -Headers $headers -Method Get
    
    Write-Host "✓ Found $($response.processors.Count) processor(s):" -ForegroundColor Green
    foreach ($proc in $response.processors) {
        $procId = $proc.name.Split('/')[-1]
        $isTarget = if ($procId -eq $PROCESSOR_ID) { " ← TARGET" } else { "" }
        Write-Host "  - $($proc.displayName) ($procId)$isTarget" -ForegroundColor $(if ($procId -eq $PROCESSOR_ID) { "Cyan" } else { "Gray" })
        Write-Host "    Type: $($proc.type)" -ForegroundColor Gray
    }
    
    # Verify target processor exists
    $targetProcessor = $response.processors | Where-Object { $_.name.EndsWith($PROCESSOR_ID) }
    if ($targetProcessor) {
        Write-Host ""
        Write-Host "✓ Target processor found!" -ForegroundColor Green
        Write-Host "  Name: $($targetProcessor.displayName)" -ForegroundColor Cyan
        Write-Host "  Type: $($targetProcessor.type)" -ForegroundColor Cyan
        Write-Host "  State: $($targetProcessor.state)" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "✗ Target processor NOT found!" -ForegroundColor Red
        Write-Host "  Expected processor ID: $PROCESSOR_ID" -ForegroundColor Yellow
        Write-Host "  This processor may not exist or you may not have access" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "✗ Failed to list processors" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Possible causes:" -ForegroundColor Yellow
    Write-Host "  - Service account lacks permissions" -ForegroundColor Gray
    Write-Host "  - Processor is in a different location" -ForegroundColor Gray
    Write-Host "  - Processor was deleted" -ForegroundColor Gray
}

# Step 5: Check IAM permissions
Write-Host ""
Write-Host "Step 5: Checking IAM permissions..." -ForegroundColor Yellow
$currentUser = gcloud config get-value account
Write-Host "  Current user: $currentUser" -ForegroundColor Gray

# Get project IAM policy
try {
    $iamPolicy = gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --format="value(bindings.role)" --filter="bindings.members:$currentUser" 2>&1
    
    if ($iamPolicy -match "roles/documentai" -or $iamPolicy -match "roles/owner" -or $iamPolicy -match "roles/editor") {
        Write-Host "✓ User has Document AI permissions" -ForegroundColor Green
    } else {
        Write-Host "⚠ User may lack Document AI permissions" -ForegroundColor Yellow
        Write-Host "  Current roles: $iamPolicy" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠ Could not verify permissions" -ForegroundColor Yellow
}

# Step 6: Update .env file
Write-Host ""
Write-Host "Step 6: Updating .env file..." -ForegroundColor Yellow

$envPath = ".env"
$envContent = Get-Content $envPath -Raw -ErrorAction SilentlyContinue

if ($envContent) {
    # Check if variables exist
    $needsUpdate = $false
    
    if ($envContent -notmatch "DOCUMENT_AI_PROCESSOR_ID=") {
        $envContent += "`nDOCUMENT_AI_PROCESSOR_ID=$PROCESSOR_ID"
        $needsUpdate = $true
    } else {
        $envContent = $envContent -replace "DOCUMENT_AI_PROCESSOR_ID=.*", "DOCUMENT_AI_PROCESSOR_ID=$PROCESSOR_ID"
        $needsUpdate = $true
    }
    
    if ($envContent -notmatch "DOCUMENT_AI_LOCATION=") {
        $envContent += "`nDOCUMENT_AI_LOCATION=$LOCATION"
        $needsUpdate = $true
    } else {
        $envContent = $envContent -replace "DOCUMENT_AI_LOCATION=.*", "DOCUMENT_AI_LOCATION=$LOCATION"
        $needsUpdate = $true
    }
    
    if ($envContent -notmatch "GOOGLE_CLOUD_PROJECT=") {
        $envContent += "`nGOOGLE_CLOUD_PROJECT=$PROJECT_ID"
        $needsUpdate = $true
    } else {
        $envContent = $envContent -replace "GOOGLE_CLOUD_PROJECT=.*", "GOOGLE_CLOUD_PROJECT=$PROJECT_ID"
        $needsUpdate = $true
    }
    
    if ($needsUpdate) {
        Set-Content -Path $envPath -Value $envContent.Trim()
        Write-Host "✓ .env file updated" -ForegroundColor Green
    } else {
        Write-Host "✓ .env file already configured" -ForegroundColor Green
    }
} else {
    Write-Host "✗ .env file not found" -ForegroundColor Red
    Write-Host "  Creating .env file..." -ForegroundColor Yellow
    
    $newEnv = @"
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=$PROJECT_ID
DOCUMENT_AI_PROCESSOR_ID=$PROCESSOR_ID
DOCUMENT_AI_LOCATION=$LOCATION

# Add your other environment variables below
"@
    Set-Content -Path $envPath -Value $newEnv
    Write-Host "✓ .env file created" -ForegroundColor Green
}

# Step 7: Test Document AI access
Write-Host ""
Write-Host "Step 7: Testing Document AI access..." -ForegroundColor Yellow

try {
    $testProcessorUrl = "https://us-documentai.googleapis.com/v1/projects/$PROJECT_ID/locations/$LOCATION/processors/${PROCESSOR_ID}"
    $testResponse = Invoke-RestMethod -Uri $testProcessorUrl -Headers $headers -Method Get
    
    Write-Host "✓ Document AI processor is accessible!" -ForegroundColor Green
    Write-Host "  Processor: $($testResponse.displayName)" -ForegroundColor Cyan
    Write-Host "  Type: $($testResponse.type)" -ForegroundColor Cyan
    Write-Host "  State: $($testResponse.state)" -ForegroundColor Cyan
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "✗ Cannot access Document AI processor" -ForegroundColor Red
    Write-Host "  Status: $statusCode" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "  1. Verify processor ID is correct" -ForegroundColor Gray
    Write-Host "  2. Check IAM permissions for your account" -ForegroundColor Gray
    Write-Host "  3. Ensure Document AI API is fully enabled (may take a few minutes)" -ForegroundColor Gray
    Write-Host "  4. Try creating a new processor in the Console" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Configuration Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Environment Variables:" -ForegroundColor White
Write-Host "  GOOGLE_CLOUD_PROJECT=$PROJECT_ID" -ForegroundColor Gray
Write-Host "  DOCUMENT_AI_PROCESSOR_ID=$PROCESSOR_ID" -ForegroundColor Gray
Write-Host "  DOCUMENT_AI_LOCATION=$LOCATION" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "  1. Restart your Node.js server: node server.js" -ForegroundColor Gray
Write-Host "  2. Test document processing endpoint" -ForegroundColor Gray
Write-Host "  3. Upload a test document through the frontend" -ForegroundColor Gray
Write-Host ""
Write-Host "✓ Configuration complete!" -ForegroundColor Green
Write-Host ""
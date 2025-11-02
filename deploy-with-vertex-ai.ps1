# Deploy MedTestAI to Cloud Run with Vertex AI (NO API KEY!)
# Run this script to deploy with proper configuration

Write-Host "Deploying MedTestAI to Cloud Run with Vertex AI" -ForegroundColor Cyan
Write-Host "=" * 70

$PROJECT_ID = "pro-variety-472211-b9"
$REGION = "us-central1"
$SERVICE_NAME = "medtestai-backend"
$SERVICE_ACCOUNT = "medtestai-main@pro-variety-472211-b9.iam.gserviceaccount.com"

Write-Host "`nDeployment Configuration:" -ForegroundColor Yellow
Write-Host "  Project: $PROJECT_ID"
Write-Host "  Region: $REGION"
Write-Host "  Service: $SERVICE_NAME"
Write-Host "  Service Account: $SERVICE_ACCOUNT"
Write-Host "  Authentication: Vertex AI (ADC - No API Key!)"

Write-Host "`nRemoving old environment variables..." -ForegroundColor Yellow
# First, clear the old GEMINI_API_KEY if it exists
gcloud run services update $SERVICE_NAME `
  --region=$REGION `
  --project=$PROJECT_ID `
  --clear-env-vars 2>$null

Write-Host "Old environment variables cleared" -ForegroundColor Green

Write-Host "`nDeploying updated application..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
  --source . `
  --region=$REGION `
  --project=$PROJECT_ID `
  --service-account=$SERVICE_ACCOUNT `
  --allow-unauthenticated `
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID,NODE_ENV=production" `
  --memory=1Gi `
  --cpu=1 `
  --timeout=300 `
  --max-instances=10 `
  --platform=managed

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nDeployment successful!" -ForegroundColor Green
    
    Write-Host "`nVerifying deployment..." -ForegroundColor Yellow
    
    # Get service URL
    $SERVICE_URL = gcloud run services describe $SERVICE_NAME `
      --region=$REGION `
      --project=$PROJECT_ID `
      --format="value(status.url)"
    
    Write-Host "  Service URL: $SERVICE_URL" -ForegroundColor White
    
    # Check service account
    $ACTUAL_SA = gcloud run services describe $SERVICE_NAME `
      --region=$REGION `
      --project=$PROJECT_ID `
      --format="value(spec.template.spec.serviceAccountName)"
    
    Write-Host "  Service Account: $ACTUAL_SA" -ForegroundColor White
    
    # Check environment variables
    Write-Host "`nEnvironment Variables:" -ForegroundColor Yellow
    gcloud run services describe $SERVICE_NAME `
      --region=$REGION `
      --project=$PROJECT_ID `
      --format="value(spec.template.spec.containers[0].env)"
    
    Write-Host "`nTesting health endpoint..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    try {
        $response = Invoke-RestMethod -Uri "$SERVICE_URL/health" -Method Get
        Write-Host "Health check passed!" -ForegroundColor Green
        Write-Host ($response | ConvertTo-Json -Depth 3)
        
        if ($response.features.vertexAI -eq $true) {
            Write-Host "`nVertex AI is enabled!" -ForegroundColor Green
        } else {
            Write-Host "`nVertex AI feature not detected in health response" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "Health check failed: $_" -ForegroundColor Red
    }
    
    Write-Host "`n" -ForegroundColor Cyan
    Write-Host "=" * 70
    Write-Host "Deployment complete!" -ForegroundColor Green
    Write-Host "`nYour application is live at:" -ForegroundColor Cyan
    Write-Host "   $SERVICE_URL" -ForegroundColor White
    Write-Host "`nUsing: Vertex AI with Service Account Authentication (No API Key!)" -ForegroundColor Green
    Write-Host "=" * 70
    
} else {
    Write-Host "`nDeployment failed!" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
    exit 1
}
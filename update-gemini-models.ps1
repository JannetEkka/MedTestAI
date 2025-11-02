# ========================================
# UPDATE ALL GEMINI MODEL REFERENCES
# Updates to gemini-2.5-flash (stable, recommended for production)
# ========================================

$projectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
$newModel = "gemini-2.5-flash"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GEMINI MODEL UPDATE SCRIPT" -ForegroundColor Cyan
Write-Host "Updating to: $newModel" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Create backup directory
$backupDir = "$projectRoot\backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
Write-Host "✅ Backup directory created: $backupDir" -ForegroundColor Green

# Files to update
$filesToUpdate = @(
    @{
        Path = "$projectRoot\.env"
        SearchPattern = "GEMINI_MODEL=.*"
        ReplaceWith = "GEMINI_MODEL=$newModel"
        AddIfMissing = $true
        Section = "# Optional Gemini Configuration"
    },
    @{
        Path = "$projectRoot\.env.example"
        SearchPattern = "GEMINI_MODEL=gemini-.*"
        ReplaceWith = "GEMINI_MODEL=$newModel"
    },
    @{
        Path = "$projectRoot\services\geminiService.js"
        SearchPattern = "model:\s*['\`"]gemini-[^'\`"]+['\`"]"
        ReplaceWith = "model: '$newModel'"
    },
    @{
        Path = "$projectRoot\services\testCaseGenerator.js"
        SearchPattern = "model:\s*['\`"]gemini-[^'\`"]+['\`"]"
        ReplaceWith = "model: '$newModel'"
    },
    @{
        Path = "$projectRoot\services\testCaseGeneratorMultiCompliance.js"
        SearchPattern = "model:\s*['\`"]gemini-[^'\`"]+['\`"]"
        ReplaceWith = "model: '$newModel'"
    },
    @{
        Path = "$projectRoot\services\ai\testGenerator.js"
        SearchPattern = "model:\s*['\`"]gemini-[^'\`"]+['\`"]"
        ReplaceWith = "model: '$newModel'"
    }
)

# Update each file
foreach ($file in $filesToUpdate) {
    Write-Host ""
    Write-Host "📄 Processing: $($file.Path)" -ForegroundColor Yellow
    
    if (-not (Test-Path $file.Path)) {
        Write-Host "   ⚠️  File not found, skipping..." -ForegroundColor Yellow
        continue
    }
    
    # Backup original file
    $backupPath = Join-Path $backupDir (Split-Path $file.Path -Leaf)
    Copy-Item $file.Path $backupPath -Force
    Write-Host "   ✅ Backed up to: $backupPath" -ForegroundColor Gray
    
    # Read file content
    $content = Get-Content $file.Path -Raw
    $originalContent = $content
    
    # Handle .env file specially (add if missing)
    if ($file.Path -like "*.env" -and $file.AddIfMissing) {
        if ($content -notmatch "GEMINI_MODEL") {
            # Add GEMINI_MODEL after the section header
            $content = $content -replace "($($file.Section)[^\r\n]*)", "`$1`r`nGEMINI_MODEL=$newModel"
            Write-Host "   ➕ Added GEMINI_MODEL=$newModel" -ForegroundColor Green
        } else {
            $content = $content -replace $file.SearchPattern, $file.ReplaceWith
            Write-Host "   ✏️  Updated existing GEMINI_MODEL" -ForegroundColor Green
        }
    }
    # Handle JavaScript files
    else {
        $matches = [regex]::Matches($content, $file.SearchPattern)
        if ($matches.Count -gt 0) {
            $content = $content -replace $file.SearchPattern, $file.ReplaceWith
            Write-Host "   ✏️  Updated $($matches.Count) model reference(s)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  No model references found" -ForegroundColor Yellow
        }
    }
    
    # Save if changed
    if ($content -ne $originalContent) {
        Set-Content $file.Path $content -NoNewline
        Write-Host "   💾 Changes saved" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️  No changes needed" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ UPDATE COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Review changes: git diff" -ForegroundColor White
Write-Host "   2. Test locally: npm start" -ForegroundColor White
Write-Host "   3. Deploy: gcloud run deploy medtestai-backend" -ForegroundColor White
Write-Host ""
Write-Host "📦 Backups saved in: $backupDir" -ForegroundColor Gray
Write-Host ""

# Show what was updated
Write-Host "📊 Model Reference Summary:" -ForegroundColor Cyan
Get-ChildItem "$projectRoot\services" -Recurse -Include *.js | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "model:\s*['\`"]([^'\`"]+)['\`"]") {
        $modelName = $matches[1]
        $status = if ($modelName -eq $newModel) { "✅" } else { "⚠️" }
        Write-Host "   $status $($_.Name): $modelName" -ForegroundColor $(if ($modelName -eq $newModel) { "Green" } else { "Yellow" })
    }
}

Write-Host ""
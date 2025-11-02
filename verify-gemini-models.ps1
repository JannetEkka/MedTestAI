# ========================================
# VERIFY GEMINI MODEL REFERENCES
# Checks all files for Gemini model references
# ========================================

$projectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GEMINI MODEL VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Define search patterns
$patterns = @(
    @{ Name = ".env files"; Pattern = "GEMINI_MODEL=.*"; Path = "*.env*" },
    @{ Name = "JavaScript files"; Pattern = "model:\s*['\`"]gemini-[^'\`"]+['\`"]"; Path = "*.js" }
)

# Files to check
$filesToCheck = @(
    "$projectRoot\.env",
    "$projectRoot\.env.example",
    "$projectRoot\services\geminiService.js",
    "$projectRoot\services\testCaseGenerator.js",
    "$projectRoot\services\testCaseGeneratorMultiCompliance.js",
    "$projectRoot\services\ai\testGenerator.js"
)

$foundReferences = @()

Write-Host "🔍 Scanning files..." -ForegroundColor Yellow
Write-Host ""

foreach ($filePath in $filesToCheck) {
    if (Test-Path $filePath) {
        $fileName = Split-Path $filePath -Leaf
        $content = Get-Content $filePath -Raw
        
        # Check for GEMINI_MODEL in .env files
        if ($filePath -like "*.env*") {
            if ($content -match "GEMINI_MODEL=([^\r\n]+)") {
                $model = $matches[1].Trim()
                $status = switch ($model) {
                    "gemini-2.5-flash" { "✅ RECOMMENDED" }
                    "gemini-2.5-pro" { "✅ OK (Pro)" }
                    "gemini-flash-latest" { "⚠️  ALIAS" }
                    "gemini-1.5-flash" { "⚠️  OLD" }
                    default { "❌ UNKNOWN" }
                }
                
                $foundReferences += [PSCustomObject]@{
                    File = $fileName
                    Model = $model
                    Status = $status
                    Location = "Environment Variable"
                }
                
                Write-Host "📄 $fileName" -ForegroundColor $(if ($status -like "✅*") { "Green" } else { "Yellow" })
                Write-Host "   Model: $model" -ForegroundColor White
                Write-Host "   Status: $status" -ForegroundColor $(if ($status -like "✅*") { "Green" } elseif ($status -like "⚠️*") { "Yellow" } else { "Red" })
            } elseif ($content -match "GEMINI_API_KEY") {
                Write-Host "📄 $fileName" -ForegroundColor Gray
                Write-Host "   ⚠️  GEMINI_MODEL not defined (will use code default)" -ForegroundColor Yellow
            }
        }
        # Check for model references in JavaScript files
        else {
            $matches = [regex]::Matches($content, "model:\s*['\`"]gemini-([^'\`"]+)['\`"]")
            if ($matches.Count -gt 0) {
                foreach ($match in $matches) {
                    $model = "gemini-$($match.Groups[1].Value)"
                    $status = switch ($model) {
                        "gemini-2.5-flash" { "✅ RECOMMENDED" }
                        "gemini-2.5-pro" { "✅ OK (Pro)" }
                        "gemini-flash-latest" { "⚠️  ALIAS" }
                        "gemini-1.5-flash" { "⚠️  OLD" }
                        "gemini-pro" { "❌ DEPRECATED" }
                        default { "❌ UNKNOWN" }
                    }
                    
                    $foundReferences += [PSCustomObject]@{
                        File = $fileName
                        Model = $model
                        Status = $status
                        Location = "Code"
                    }
                    
                    Write-Host "📄 $fileName" -ForegroundColor $(if ($status -like "✅*") { "Green" } elseif ($status -like "⚠️*") { "Yellow" } else { "Red" })
                    Write-Host "   Model: $model" -ForegroundColor White
                    Write-Host "   Status: $status" -ForegroundColor $(if ($status -like "✅*") { "Green" } elseif ($status -like "⚠️*") { "Yellow" } else { "Red" })
                }
            } else {
                Write-Host "📄 $fileName" -ForegroundColor Gray
                Write-Host "   ℹ️  No model references found" -ForegroundColor Gray
            }
        }
        Write-Host ""
    } else {
        Write-Host "⚠️  File not found: $filePath" -ForegroundColor Yellow
        Write-Host ""
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Count by status
$recommended = ($foundReferences | Where-Object { $_.Status -like "✅*" }).Count
$warning = ($foundReferences | Where-Object { $_.Status -like "⚠️*" }).Count
$error = ($foundReferences | Where-Object { $_.Status -like "❌*" }).Count

Write-Host "Total References Found: $($foundReferences.Count)" -ForegroundColor White
Write-Host "   ✅ Recommended: $recommended" -ForegroundColor Green
Write-Host "   ⚠️  Needs Update: $warning" -ForegroundColor Yellow
Write-Host "   ❌ Deprecated: $error" -ForegroundColor Red
Write-Host ""

if ($warning -gt 0 -or $error -gt 0) {
    Write-Host "💡 RECOMMENDATION:" -ForegroundColor Yellow
    Write-Host "   Run: .\update-gemini-models.ps1" -ForegroundColor White
    Write-Host "   This will update all references to: gemini-2.5-flash" -ForegroundColor Green
    Write-Host ""
}

Write-Host "📖 MODEL GUIDE:" -ForegroundColor Cyan
Write-Host "   ✅ gemini-2.5-flash     - RECOMMENDED (stable, production-ready)" -ForegroundColor Green
Write-Host "   ✅ gemini-2.5-pro       - OK (advanced reasoning, more expensive)" -ForegroundColor Green
Write-Host "   ⚠️  gemini-flash-latest  - ALIAS (auto-updates, may change)" -ForegroundColor Yellow
Write-Host "   ⚠️  gemini-1.5-flash     - OLD (previous generation, still works)" -ForegroundColor Yellow
Write-Host "   ❌ gemini-pro           - DEPRECATED (returns 404)" -ForegroundColor Red
Write-Host ""
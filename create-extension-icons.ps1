# create-extension-icons.ps1
# Automatically creates placeholder icons for Chrome extension

Write-Host "🎨 Creating Chrome Extension Icons..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

$projectRoot = "D:\Projects\Gen AI Exchange Hackathon\MedTestAI"
$iconsPath = Join-Path $projectRoot "chrome-extension\icons"

# Create icons directory if it doesn't exist
if (-not (Test-Path $iconsPath)) {
    Write-Host "`n📁 Creating icons directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $iconsPath -Force | Out-Null
    Write-Host "✅ Icons directory created" -ForegroundColor Green
} else {
    Write-Host "`n📁 Icons directory already exists" -ForegroundColor Gray
}

# Add System.Drawing assembly
Add-Type -AssemblyName System.Drawing

# Function to create icon
function Create-MedicalIcon {
    param(
        [int]$size,
        [string]$path
    )
    
    try {
        # Create bitmap
        $bitmap = New-Object System.Drawing.Bitmap($size, $size)
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        
        # Fill with medical blue gradient background
        $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
        $gradientBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
            $rect,
            [System.Drawing.Color]::FromArgb(52, 152, 219),   # Light blue
            [System.Drawing.Color]::FromArgb(41, 128, 185),   # Darker blue
            45
        )
        $graphics.FillRectangle($gradientBrush, $rect)
        
        # Add white medical cross
        $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
        
        # Calculate cross dimensions (40% of icon size)
        $crossSize = $size * 0.4
        $crossThickness = $size * 0.12
        $centerX = $size / 2
        $centerY = $size / 2
        
        # Draw horizontal bar
        $hBar = New-Object System.Drawing.RectangleF(
            ($centerX - $crossSize/2),
            ($centerY - $crossThickness/2),
            $crossSize,
            $crossThickness
        )
        $graphics.FillRectangle($whiteBrush, $hBar)
        
        # Draw vertical bar
        $vBar = New-Object System.Drawing.RectangleF(
            ($centerX - $crossThickness/2),
            ($centerY - $crossSize/2),
            $crossThickness,
            $crossSize
        )
        $graphics.FillRectangle($whiteBrush, $vBar)
        
        # Add subtle shadow/border
        $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(100, 0, 0, 0), 1)
        $graphics.DrawRectangle($borderPen, 0, 0, $size - 1, $size - 1)
        
        # Save
        $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
        
        # Cleanup
        $graphics.Dispose()
        $bitmap.Dispose()
        $gradientBrush.Dispose()
        $whiteBrush.Dispose()
        $borderPen.Dispose()
        
        return $true
    }
    catch {
        Write-Host "❌ Error creating ${size}x${size} icon: $_" -ForegroundColor Red
        return $false
    }
}

# Create all three icon sizes
Write-Host "`n🖼️  Generating icon files..." -ForegroundColor Yellow

$icons = @(
    @{Size=16; Name="icon16.png"},
    @{Size=48; Name="icon48.png"},
    @{Size=128; Name="icon128.png"}
)

$successCount = 0
foreach ($icon in $icons) {
    $iconPath = Join-Path $iconsPath $icon.Name
    Write-Host "   Creating $($icon.Name) ($($icon.Size)x$($icon.Size))..." -NoNewline
    
    if (Create-MedicalIcon -size $icon.Size -path $iconPath) {
        Write-Host " ✅" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host " ❌" -ForegroundColor Red
    }
}

Write-Host "`n" + "=" * 60 -ForegroundColor Cyan

if ($successCount -eq 3) {
    Write-Host "✅ SUCCESS! All icons created successfully!" -ForegroundColor Green
    Write-Host "`n📍 Icons location: $iconsPath" -ForegroundColor Cyan
    Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Open Chrome → chrome://extensions/" -ForegroundColor White
    Write-Host "   2. Enable 'Developer mode' (top right)" -ForegroundColor White
    Write-Host "   3. Click 'Load unpacked'" -ForegroundColor White
    Write-Host "   4. Select folder: $projectRoot\chrome-extension" -ForegroundColor White
    Write-Host "   5. Extension should load without errors! 🎉" -ForegroundColor White
    
    # Verify files
    Write-Host "`n📊 Verification:" -ForegroundColor Yellow
    Get-ChildItem $iconsPath | ForEach-Object {
        $sizeKB = [math]::Round($_.Length / 1KB, 2)
        Write-Host "   ✓ $($_.Name) - ${sizeKB} KB" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  WARNING: Only $successCount/3 icons created" -ForegroundColor Yellow
    Write-Host "Please check the error messages above and try again" -ForegroundColor Yellow
}

Write-Host "`n" + "=" * 60 -ForegroundColor Cyan
Write-Host "Script completed!" -ForegroundColor Cyan
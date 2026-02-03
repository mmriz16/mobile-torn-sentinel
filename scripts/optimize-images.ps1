
Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param(
        [string]$Path,
        [int]$TargetWidth,
        [int]$TargetHeight
    )

    if (-not (Test-Path -Path $Path)) { 
        Write-Host "File not found: $Path"
        return 
    }

    try {
        $img = [System.Drawing.Image]::FromFile($Path)
        
        # Calculate new dimensions (keeping aspect ratio, or fitting into target)
        # For icons, we usually want to force fit or keep within bounds.
        # Let's keep within bounds to maintain aspect ratio.
        $ratioX = $TargetWidth / $img.Width
        $ratioY = $TargetHeight / $img.Height
        $ratio = $ratioX
        if ($ratioY -lt $ratioX) { $ratio = $ratioY }
        
        # Don't upscale
        if ($ratio -gt 1.0) { $ratio = 1.0 }

        $newWidth = [int]($img.Width * $ratio)
        $newHeight = [int]($img.Height * $ratio)

        if ($img.Width -eq $newWidth -and $img.Height -eq $newHeight) {
            $img.Dispose()
            Write-Host "Skipping $Path (already small enough)"
            return
        }

        $newImg = new-object System.Drawing.Bitmap $newWidth, $newHeight
        $graph = [System.Drawing.Graphics]::FromImage($newImg)
        $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graph.DrawImage($img, 0, 0, $newWidth, $newHeight)
        
        # Dispose original to unlock file
        $img.Dispose()

        # Save to temp then move
        $tempPath = "$Path.tmp.png"
        $newImg.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $newImg.Dispose()
        $graph.Dispose()

        Move-Item -Force $tempPath $Path
        Write-Host "Resized $Path to ${newWidth}x${newHeight}"
    }
    catch {
        Write-Host "Error resizing $Path : $_"
        if ($img) { $img.Dispose() }
        if ($newImg) { $newImg.Dispose() }
        if ($graph) { $graph.Dispose() }
    }
}

# 1. Main Icons (Target 1024x1024)
Resize-Image "assets\images\icon.png" 1024 1024
Resize-Image "assets\images\splash-icon.png" 1024 1024
Resize-Image "assets\images\splash-full.png" 1284 2778 

# 2. Notification Icons (Target 96x96 - xxxhdpi is usually enough for notification small icon)
# Actually, notification icons in drawable should be small. 
# Android notification icons are usually 24dp. xxxhdpi = 4x = 96px.
# We will use 96x96 safe limit.
$notifIcons = @(
    "plane.png", "energy.png", "pharmacy.png", "city.png", 
    "hospital.png", "jail.png", "stock.png", "gym.png", 
    "bank.png", "casino.png", "racing.png",
    "book.png", "booster.png", "card.png", "chain.png",
    "drug.png", "happy.png", "heart.png", "nerve.png",
    "returning.png", "travelling.png"
)

foreach ($icon in $notifIcons) {
    Resize-Image "assets\images\$icon" 96 96
}

# 3. Widget Preview (The culprit?)
Resize-Image "android\app\src\main\res\drawable\hello_preview.png" 512 512

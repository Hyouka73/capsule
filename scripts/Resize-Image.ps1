
# Resize-Image.ps1
param (
    [string]$SourcePath,
    [string]$DestinationPath,
    [int]$Width,
    [int]$Height
)

Add-Type -AssemblyName System.Drawing

$srcImage = [System.Drawing.Image]::FromFile($SourcePath)
$newImage = new-object System.Drawing.Bitmap $Width, $Height

$graph = [System.Drawing.Graphics]::FromImage($newImage)
$graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$graph.DrawImage($srcImage, 0, 0, $Width, $Height)

$newImage.Save($DestinationPath, [System.Drawing.Imaging.ImageFormat]::Png)

$srcImage.Dispose()
$newImage.Dispose()
$graph.Dispose()

Write-Host "Generated $DestinationPath"

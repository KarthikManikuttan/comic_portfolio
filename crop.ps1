Add-Type -AssemblyName System.Drawing
$srcPath = "c:\project\web_portfolio\favicon.png"
$dstPath = "c:\project\web_portfolio\favicon_cropped.png"
$bmp = [System.Drawing.Bitmap]::FromFile($srcPath)
$width = $bmp.Width
$height = $bmp.Height
$minX = $width; $minY = $height; $maxX = 0; $maxY = 0

for ($y = 0; $y -lt $height; $y++) {
    for ($x = 0; $x -lt $width; $x++) {
        if ($bmp.GetPixel($x, $y).A -gt 10) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$cropWidth = $maxX - $minX + 1
$cropHeight = $maxY - $minY + 1
$targetSize = [Math]::Max($cropWidth, $cropHeight)
$padding = [int]($targetSize * 0.1)
$targetSize = $targetSize + ($padding * 2)

$squareBmp = New-Object System.Drawing.Bitmap $targetSize, $targetSize
$g = [System.Drawing.Graphics]::FromImage($squareBmp)
$bgBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 10, 10, 10))
$g.FillRectangle($bgBrush, 0, 0, $targetSize, $targetSize)

$destRect = New-Object System.Drawing.Rectangle (($targetSize - $cropWidth) / 2), (($targetSize - $cropHeight) / 2), $cropWidth, $cropHeight
$srcRect = New-Object System.Drawing.Rectangle $minX, $minY, $cropWidth, $cropHeight
$g.DrawImage($bmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$squareBmp.Save($dstPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose(); $bgBrush.Dispose(); $squareBmp.Dispose(); $bmp.Dispose()

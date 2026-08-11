Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Bitmap]::FromFile((Resolve-Path 'public/icons/icon-512.png'))

function Make-Icon($outPath, $canvas, $scale) {
  $bmp = New-Object System.Drawing.Bitmap $canvas, $canvas
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.Clear([System.Drawing.Color]::Transparent)
  $size = [int]($canvas * $scale)
  $offset = [int](($canvas - $size) / 2)
  $g.DrawImage($src, $offset, $offset, $size, $size)
  $g.Dispose()
  $dir = Split-Path $outPath
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

$root = 'android/app/src/main/res'

# Flat legacy launcher icon + round variant -- fill most of the canvas,
# the source already has built-in padding around the diagonal pills.
Make-Icon "$root/mipmap-mdpi/ic_launcher.png" 48 0.92
Make-Icon "$root/mipmap-mdpi/ic_launcher_round.png" 48 0.92
Make-Icon "$root/mipmap-hdpi/ic_launcher.png" 72 0.92
Make-Icon "$root/mipmap-hdpi/ic_launcher_round.png" 72 0.92
Make-Icon "$root/mipmap-xhdpi/ic_launcher.png" 96 0.92
Make-Icon "$root/mipmap-xhdpi/ic_launcher_round.png" 96 0.92
Make-Icon "$root/mipmap-xxhdpi/ic_launcher.png" 144 0.92
Make-Icon "$root/mipmap-xxhdpi/ic_launcher_round.png" 144 0.92
Make-Icon "$root/mipmap-xxxhdpi/ic_launcher.png" 192 0.92
Make-Icon "$root/mipmap-xxxhdpi/ic_launcher_round.png" 192 0.92

# Adaptive icon foreground layer -- 108dp canvas per density, content kept
# to ~62% so it survives circle/squircle/rounded-square OS masks without
# clipping.
Make-Icon "$root/mipmap-mdpi/ic_launcher_foreground.png" 108 0.62
Make-Icon "$root/mipmap-hdpi/ic_launcher_foreground.png" 162 0.62
Make-Icon "$root/mipmap-xhdpi/ic_launcher_foreground.png" 216 0.62
Make-Icon "$root/mipmap-xxhdpi/ic_launcher_foreground.png" 324 0.62
Make-Icon "$root/mipmap-xxxhdpi/ic_launcher_foreground.png" 432 0.62

# Splash screen mark -- single density-independent copy, sized via the
# layer-list item in drawable/splash.xml.
Make-Icon "$root/drawable-nodpi/ic_chatgiza_logo.png" 512 1.0

$src.Dispose()
Write-Output "done"

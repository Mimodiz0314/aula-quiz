Add-Type -AssemblyName System.Drawing

$src = [System.Drawing.Image]::FromFile("public\logo.png")

# 192x192
$b1 = New-Object System.Drawing.Bitmap(192, 192)
$g1 = [System.Drawing.Graphics]::FromImage($b1)
$g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1.DrawImage($src, 0, 0, 192, 192)
$b1.Save("public\pwa-192x192.png", [System.Drawing.Imaging.ImageFormat]::Png)
$b1.Dispose()
$g1.Dispose()

# 512x512
$b2 = New-Object System.Drawing.Bitmap(512, 512)
$g2 = [System.Drawing.Graphics]::FromImage($b2)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($src, 0, 0, 512, 512)
$b2.Save("public\pwa-512x512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$b2.Dispose()
$g2.Dispose()

# Screenshot Wide 1280x720
$b3 = New-Object System.Drawing.Bitmap(1280, 720)
$g3 = [System.Drawing.Graphics]::FromImage($b3)
$g3.Clear([System.Drawing.Color]::White)
$w3 = 512; $h3 = 512
$x3 = [Math]::Floor((1280 - $w3) / 2)
$y3 = [Math]::Floor((720 - $h3) / 2)
$g3.DrawImage($src, $x3, $y3, $w3, $h3)
$b3.Save("public\screenshot-wide.png", [System.Drawing.Imaging.ImageFormat]::Png)
$b3.Dispose()
$g3.Dispose()

# Screenshot Narrow 720x1280
$b4 = New-Object System.Drawing.Bitmap(720, 1280)
$g4 = [System.Drawing.Graphics]::FromImage($b4)
$g4.Clear([System.Drawing.Color]::White)
$w4 = 512; $h4 = 512
$x4 = [Math]::Floor((720 - $w4) / 2)
$y4 = [Math]::Floor((1280 - $h4) / 2)
$g4.DrawImage($src, $x4, $y4, $w4, $h4)
$b4.Save("public\screenshot-narrow.png", [System.Drawing.Imaging.ImageFormat]::Png)
$b4.Dispose()
$g4.Dispose()

$src.Dispose()

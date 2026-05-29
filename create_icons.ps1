Add-Type -AssemblyName System.Drawing

$b1 = New-Object System.Drawing.Bitmap(192, 192)
$g1 = [System.Drawing.Graphics]::FromImage($b1)
$g1.Clear([System.Drawing.Color]::White)
$b1.Save("public\pwa-192x192.png", [System.Drawing.Imaging.ImageFormat]::Png)
$b1.Dispose()
$g1.Dispose()

$b2 = New-Object System.Drawing.Bitmap(512, 512)
$g2 = [System.Drawing.Graphics]::FromImage($b2)
$g2.Clear([System.Drawing.Color]::White)
$b2.Save("public\pwa-512x512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$b2.Dispose()
$g2.Dispose()

$b3 = New-Object System.Drawing.Bitmap(1280, 720)
$g3 = [System.Drawing.Graphics]::FromImage($b3)
$g3.Clear([System.Drawing.Color]::White)
$b3.Save("public\screenshot-wide.png", [System.Drawing.Imaging.ImageFormat]::Png)
$b3.Dispose()
$g3.Dispose()

$b4 = New-Object System.Drawing.Bitmap(720, 1280)
$g4 = [System.Drawing.Graphics]::FromImage($b4)
$g4.Clear([System.Drawing.Color]::White)
$b4.Save("public\screenshot-narrow.png", [System.Drawing.Imaging.ImageFormat]::Png)
$b4.Dispose()
$g4.Dispose()

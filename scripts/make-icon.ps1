$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectPath = Split-Path -Parent $PSScriptRoot
$assetPath = Join-Path $projectPath 'assets'
$bitmap = New-Object System.Drawing.Bitmap 256,256
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$shape = New-Object System.Drawing.Drawing2D.GraphicsPath
$shape.AddArc(12,48,88,88,180,90)
$shape.AddArc(156,48,88,88,270,90)
$shape.AddArc(156,120,88,88,0,90)
$shape.AddArc(12,120,88,88,90,90)
$shape.CloseFigure()
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(135,216,255))
$graphics.FillPath($brush,$shape)
$graphics.FillRectangle([System.Drawing.Brushes]::White,112,82,32,92)
$graphics.FillRectangle([System.Drawing.Brushes]::White,82,112,92,32)
$brush.Dispose()
$bitmap.Save((Join-Path $assetPath 'icon.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$stream = New-Object System.IO.MemoryStream
$bitmap.Save($stream,[System.Drawing.Imaging.ImageFormat]::Png)
$png = $stream.ToArray()
$file = [System.IO.File]::Create((Join-Path $assetPath 'icon.ico'))
$writer = New-Object System.IO.BinaryWriter($file)
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]1)
$writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([byte]0)
$writer.Write([uint16]1); $writer.Write([uint16]32); $writer.Write([uint32]$png.Length); $writer.Write([uint32]22)
$writer.Write($png); $writer.Dispose(); $stream.Dispose(); $graphics.Dispose(); $shape.Dispose(); $bitmap.Dispose()

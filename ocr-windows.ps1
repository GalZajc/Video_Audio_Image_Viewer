param([Parameter(Mandatory=$true)][string]$InputFile)
$ErrorActionPreference='Stop'
$InputFile=[System.IO.Path]::GetFullPath($InputFile)
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$await9=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Await-Ocr9($Operation,[Type]$ResultType) { $task9=$await9.MakeGenericMethod($ResultType).Invoke($null,@($Operation)); $task9.GetAwaiter().GetResult() }
$file9=Await-Ocr9 ([Windows.Storage.StorageFile]::GetFileFromPathAsync($InputFile)) ([Windows.Storage.StorageFile])
$stream9=Await-Ocr9 ($file9.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
try {
 $decoder9=Await-Ocr9 ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream9)) ([Windows.Graphics.Imaging.BitmapDecoder])
 $limit9=[Windows.Media.Ocr.OcrEngine]::MaxImageDimension
 $scale9=[Math]::Min(1.0,$limit9/[double][Math]::Max($decoder9.PixelWidth,$decoder9.PixelHeight))
 $transform9=New-Object Windows.Graphics.Imaging.BitmapTransform
 $transform9.ScaledWidth=[uint32][Math]::Max(1,[Math]::Floor($decoder9.PixelWidth*$scale9))
 $transform9.ScaledHeight=[uint32][Math]::Max(1,[Math]::Floor($decoder9.PixelHeight*$scale9))
 $bitmap9=Await-Ocr9 ($decoder9.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,[Windows.Graphics.Imaging.BitmapAlphaMode]::Ignore,$transform9,[Windows.Graphics.Imaging.ExifOrientationMode]::IgnoreExifOrientation,[Windows.Graphics.Imaging.ColorManagementMode]::DoNotColorManage)) ([Windows.Graphics.Imaging.SoftwareBitmap])
 try {
  $engine9=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if (!$engine9) { $language9=[Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages | Select-Object -First 1; if ($language9) { $engine9=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language9) } }
  if (!$engine9) { throw 'No Windows OCR language is installed.' }
  $result9=Await-Ocr9 ($engine9.RecognizeAsync($bitmap9)) ([Windows.Media.Ocr.OcrResult])
  $lines9=@($result9.Lines | ForEach-Object { $line9=$_; @{text=$line9.Text;words=@($line9.Words | ForEach-Object { $rect9=$_.BoundingRect; @{text=$_.Text;x=$rect9.X/$scale9;y=$rect9.Y/$scale9;width=$rect9.Width/$scale9;height=$rect9.Height/$scale9} })} })
  @{lines=$lines9;text=$result9.Text;language=$engine9.RecognizerLanguage.LanguageTag;width=$decoder9.PixelWidth;height=$decoder9.PixelHeight} | ConvertTo-Json -Depth 8 -Compress
 } finally { if ($bitmap9) { $bitmap9.Dispose() } }
} finally { $stream9.Dispose() }

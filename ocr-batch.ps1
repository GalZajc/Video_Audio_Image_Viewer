param([Parameter(Mandatory=$true)][string]$InputList)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Graphics.Imaging.BitmapDecoder,Windows.Graphics.Imaging,ContentType=WindowsRuntime]
$null=[Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$await10=[System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Await-Ocr10($Operation,[Type]$ResultType) { $task10=$await10.MakeGenericMethod($ResultType).Invoke($null,@($Operation)); $task10.GetAwaiter().GetResult() }
$engine10=[Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if (!$engine10) { $language10=[Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages | Select-Object -First 1; if ($language10) { $engine10=[Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($language10) } }
if (!$engine10) { throw 'No Windows OCR language is installed.' }
$files10=[IO.File]::ReadAllText([IO.Path]::GetFullPath($InputList),[Text.Encoding]::UTF8) | ConvertFrom-Json
$results10=@(foreach($path10 in $files10){
 $file10=Await-Ocr10 ([Windows.Storage.StorageFile]::GetFileFromPathAsync([IO.Path]::GetFullPath($path10))) ([Windows.Storage.StorageFile])
 $stream10=Await-Ocr10 ($file10.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
 try {
  $decoder10=Await-Ocr10 ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream10)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $scale10=[Math]::Min(1.0,[Windows.Media.Ocr.OcrEngine]::MaxImageDimension/[double][Math]::Max($decoder10.PixelWidth,$decoder10.PixelHeight))
  $transform10=New-Object Windows.Graphics.Imaging.BitmapTransform
  $transform10.ScaledWidth=[uint32][Math]::Max(1,[Math]::Floor($decoder10.PixelWidth*$scale10))
  $transform10.ScaledHeight=[uint32][Math]::Max(1,[Math]::Floor($decoder10.PixelHeight*$scale10))
  $bitmap10=Await-Ocr10 ($decoder10.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,[Windows.Graphics.Imaging.BitmapAlphaMode]::Ignore,$transform10,[Windows.Graphics.Imaging.ExifOrientationMode]::IgnoreExifOrientation,[Windows.Graphics.Imaging.ColorManagementMode]::DoNotColorManage)) ([Windows.Graphics.Imaging.SoftwareBitmap])
  try {
   $result10=Await-Ocr10 ($engine10.RecognizeAsync($bitmap10)) ([Windows.Media.Ocr.OcrResult])
   $lines10=@($result10.Lines | ForEach-Object { $line10=$_; @{text=$line10.Text;words=@($line10.Words | ForEach-Object { $rect10=$_.BoundingRect; @{text=$_.Text;x=$rect10.X/$scale10;y=$rect10.Y/$scale10;width=$rect10.Width/$scale10;height=$rect10.Height/$scale10} })} })
   @{lines=$lines10;text=$result10.Text;angle=$result10.TextAngle;language=$engine10.RecognizerLanguage.LanguageTag;width=$decoder10.PixelWidth;height=$decoder10.PixelHeight}
  } finally { $bitmap10.Dispose() }
 } finally { $stream10.Dispose() }
})
@{results=$results10} | ConvertTo-Json -Depth 9 -Compress

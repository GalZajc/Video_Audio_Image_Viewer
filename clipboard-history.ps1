param([Parameter(Mandatory=$true)][string]$Destination,[int]$MaximumItems=32,[long]$MaximumBytes=67108864)
$ErrorActionPreference='Stop'
[Console]::OutputEncoding=New-Object Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -AssemblyName System.Drawing
$null=[Windows.ApplicationModel.DataTransfer.Clipboard,Windows.ApplicationModel.DataTransfer,ContentType=WindowsRuntime]
$null=[Windows.Storage.Streams.RandomAccessStreamReference,Windows.Storage.Streams,ContentType=WindowsRuntime]
$awaitHistory=[System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'}|Select-Object -First 1
function Await-History($Operation,[Type]$ResultType){$task=$awaitHistory.MakeGenericMethod($ResultType).Invoke($null,@($Operation));$task.GetAwaiter().GetResult()}
$runtime=[Runtime.InteropServices.RuntimeEnvironment]::GetRuntimeDirectory()
$source=Join-Path $PSScriptRoot 'clipboard-history.cs'
$cache=Join-Path $PSScriptRoot 'DATA\clipboard-runtime'
if($env:VAP_ROOT){$cache=Join-Path $env:VAP_ROOT 'DATA\clipboard-runtime'}
[IO.Directory]::CreateDirectory($cache)|Out-Null
$hasher=[Security.Cryptography.SHA256]::Create();try{$hash=[BitConverter]::ToString($hasher.ComputeHash([IO.File]::ReadAllBytes($source))).Replace('-','')}finally{$hasher.Dispose()}
$helper=Join-Path $cache ($hash+'.dll')
if(![IO.File]::Exists($helper)){
 $facades=@('System.Runtime','System.Runtime.InteropServices.WindowsRuntime')|ForEach-Object{[Reflection.Assembly]::Load($_+', Version=4.0.0.0, Culture=neutral, PublicKeyToken=b03f5f7f11d50a3a').Location}
 $references=@($facades|ForEach-Object{'/reference:'+$_})
 $temporary=Join-Path $cache ([Guid]::NewGuid().ToString()+'.dll')
 $compiler=Join-Path $runtime 'csc.exe'
 $messages=& $compiler /nologo /target:library ('/out:'+$temporary) @references ('/reference:'+(Join-Path $env:WINDIR 'System32\WinMetadata\Windows.Foundation.winmd')) ('/reference:'+(Join-Path $env:WINDIR 'System32\WinMetadata\Windows.Storage.winmd')) $source
 if($LASTEXITCODE -ne 0){throw ('Clipboard bridge compilation failed: '+($messages -join ' '))}
 if([IO.File]::Exists($helper)){[IO.File]::Delete($temporary)}else{[IO.File]::Move($temporary,$helper)}
}
Add-Type -Path $helper
$result=Await-History ([Windows.ApplicationModel.DataTransfer.Clipboard]::GetHistoryItemsAsync()) ([Windows.ApplicationModel.DataTransfer.ClipboardHistoryItemsResult])
$items=@()
if($result.Status.ToString() -eq 'Success'){
 [IO.Directory]::CreateDirectory([IO.Path]::GetFullPath($Destination))|Out-Null
 foreach($item in ($result.Items|Sort-Object Timestamp -Descending)){
  if($items.Count -ge $MaximumItems){break}
  if(!$item.Content.Contains([Windows.ApplicationModel.DataTransfer.StandardDataFormats]::Bitmap)){continue}
  $file=$null
  try{
   $reference=Await-History ($item.Content.GetBitmapAsync()) ([Windows.Storage.Streams.RandomAccessStreamReference])
   $file=[IO.Path]::Combine([IO.Path]::GetFullPath($Destination),([Guid]::NewGuid().ToString()+'.png'))
   $random=Await-History ($reference.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
   $size=[ViewerClipboardImage]::Size($random)
   if($size -gt $MaximumBytes){continue}
   $reader=[ViewerClipboardImage]::Reader($random)
   try{$count=Await-History ($reader.LoadAsync([uint32]$size)) ([uint32]);$bytes=New-Object byte[] $count;$reader.ReadBytes($bytes);$memory=New-Object IO.MemoryStream(,$bytes);$image=$null;try{$image=[Drawing.Image]::FromStream($memory);$image.Save($file,[Drawing.Imaging.ImageFormat]::Png)}finally{if($image){$image.Dispose()};$memory.Dispose()}}finally{$reader.Dispose()}
   $items+=@{path=$file;modified=$item.Timestamp.ToUnixTimeMilliseconds()}
  }catch{if($file -and [IO.File]::Exists($file)){[IO.File]::Delete($file)}}
 }
}
@{status=$result.Status.ToString();items=@($items)}|ConvertTo-Json -Depth 4 -Compress

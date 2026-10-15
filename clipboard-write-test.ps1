param([Parameter(Mandatory=$true)][string]$ImagePath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null=[Windows.ApplicationModel.DataTransfer.Clipboard,Windows.ApplicationModel.DataTransfer,ContentType=WindowsRuntime]
$null=[Windows.Storage.StorageFile,Windows.Storage,ContentType=WindowsRuntime]
$null=[Windows.Storage.Streams.RandomAccessStreamReference,Windows.Storage.Streams,ContentType=WindowsRuntime]
$await=[System.WindowsRuntimeSystemExtensions].GetMethods()|Where-Object {$_.Name -eq 'AsTask' -and $_.IsGenericMethod -and $_.GetGenericArguments().Count -eq 1 -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'}|Select-Object -First 1
$task=$await.MakeGenericMethod([Windows.Storage.StorageFile]).Invoke($null,@([Windows.Storage.StorageFile]::GetFileFromPathAsync([IO.Path]::GetFullPath($ImagePath))))
$file=$task.GetAwaiter().GetResult()
$package=New-Object Windows.ApplicationModel.DataTransfer.DataPackage
$package.SetBitmap([Windows.Storage.Streams.RandomAccessStreamReference]::CreateFromFile($file))
$options=New-Object Windows.ApplicationModel.DataTransfer.ClipboardContentOptions
$options.IsAllowedInHistory=$false
$options.IsRoamable=$false
if(![Windows.ApplicationModel.DataTransfer.Clipboard]::SetContentWithOptions($package,$options)){throw 'Clipboard write was rejected.'}
[Windows.ApplicationModel.DataTransfer.Clipboard]::Flush()

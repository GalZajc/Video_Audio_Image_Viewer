param([switch]$OpenSettings)
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$exePath = Join-Path $projectPath 'app\Video Audio Image Viewer-win32-x64\VideoAudioImageViewer.exe'
if (-not (Test-Path -LiteralPath $exePath)) { throw 'First build Video Audio Image Viewer.' }
function Set-RegistryString($Key,$Name,$Value) {
    New-Item -Path $Key -Force | Out-Null
    New-ItemProperty -LiteralPath $Key -Name $Name -Value $Value -PropertyType String -Force | Out-Null
}
$classKey = 'HKCU:\Software\Classes\VideoAudioImageViewer.Media'
Set-RegistryString $classKey '(default)' 'Video Audio Image Viewer media'
Set-RegistryString "$classKey\DefaultIcon" '(default)' ('"' + $exePath + '",0')
Set-RegistryString "$classKey\shell\open\command" '(default)' ('"' + $exePath + '" "%1"')
$applicationKey = 'HKCU:\Software\Classes\Applications\VideoAudioImageViewer.exe'
Set-RegistryString $applicationKey 'FriendlyAppName' 'Video Audio Image Viewer'
Set-RegistryString "$applicationKey\shell\open\command" '(default)' ('"' + $exePath + '" "%1"')
$capabilitiesKey = 'HKCU:\Software\VideoAudioImageViewer\Capabilities'
Set-RegistryString $capabilitiesKey 'ApplicationName' 'Video Audio Image Viewer'
Set-RegistryString $capabilitiesKey 'ApplicationDescription' 'Tabbed video, audio and image viewer'
Set-RegistryString $capabilitiesKey 'ApplicationIcon' ('"' + $exePath + '",0')
$config = Get-Content -LiteralPath (Join-Path $projectPath 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$extensions = @($config.mediaTypes.video + $config.mediaTypes.audio + $config.mediaTypes.image) | Where-Object { $_ -notin $config.associations.excluded } | ForEach-Object { '.' + $_ }
foreach ($extension in $extensions) {
    Set-RegistryString "$capabilitiesKey\FileAssociations" $extension 'VideoAudioImageViewer.Media'
    Set-RegistryString "$applicationKey\SupportedTypes" $extension ''
    Set-RegistryString "HKCU:\Software\Classes\$extension\OpenWithProgids" 'VideoAudioImageViewer.Media' ''
}
Set-RegistryString 'HKCU:\Software\RegisteredApplications' 'VideoAudioImageViewer' 'Software\VideoAudioImageViewer\Capabilities'
# Remove our former SVG advertisement, preserving other applications and choices.
foreach ($extension in $config.associations.excluded) {
    $excludedExtension = '.' + $extension
    foreach ($entry in @(@{Key="$capabilitiesKey\FileAssociations";Name=$excludedExtension},@{Key="$applicationKey\SupportedTypes";Name=$excludedExtension},@{Key="HKCU:\Software\Classes\$excludedExtension\OpenWithProgids";Name='VideoAudioImageViewer.Media'})) {
        Remove-ItemProperty -LiteralPath $entry.Key -Name $entry.Name -ErrorAction SilentlyContinue
    }
}
Set-RegistryString 'HKCU:\Software\Classes\VideoAudioPlayer.Media\shell\open\command' '(default)' ('"' + $exePath + '" "%1"')
if ($OpenSettings) { Start-Process 'ms-settings:defaultapps?registeredAppUser=VideoAudioImageViewer' }
Write-Output 'Video Audio Image Viewer is registered in Windows Default apps.'

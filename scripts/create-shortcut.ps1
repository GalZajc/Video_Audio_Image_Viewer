$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$exePath = Join-Path $projectPath 'app\Video Audio Image Viewer-win32-x64\VideoAudioImageViewer.exe'
if (-not (Test-Path -LiteralPath $exePath)) { throw 'Build the application first.' }
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut((Join-Path $projectPath 'Video Audio Image Viewer.lnk'))
$shortcut.TargetPath = $exePath
$shortcut.WorkingDirectory = $projectPath
$shortcut.IconLocation = "$exePath,0"
$shortcut.Description = 'Video Audio Image Viewer'
$shortcut.Save()

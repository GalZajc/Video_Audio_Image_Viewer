param([switch]$RegisterOnly)
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
& (Join-Path $PSScriptRoot 'register-defaults.ps1')
if ($RegisterOnly) { return }
$config = Get-Content -LiteralPath (Join-Path $projectPath 'config.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$extensions = @($config.mediaTypes.video + $config.mediaTypes.audio + $config.mediaTypes.image) | Where-Object { $_ -notin $config.associations.excluded } | ForEach-Object { '.' + $_ }
$setupPath = Join-Path $projectPath 'DATA\associations'
New-Item -ItemType Directory -Path $setupPath -Force | Out-Null
$reportPath = Join-Path $setupPath ('registration_' + (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss') + '.json')
@{registered=$extensions; excluded=$config.associations.excluded; defaultsVerified=$false; reason='Windows requires confirmation in its Default apps UI. Registry queries do not prove ShellExecute behavior on current consumer Windows.'; documentation='https://learn.microsoft.com/en-us/windows/apps/develop/windows-integration/default-apps-platform'} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8
Start-Process 'ms-settings:defaultapps?registeredAppUser=VideoAudioImageViewer'
Write-Output 'All supported types are registered. Confirm their defaults on the opened app-specific Windows page. SVG is excluded.'
Write-Output "Registration report: $reportPath"

# Actual Explorer-style activation, rather than a registry-only association check.
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$exePath = Join-Path $projectPath 'app\Video Audio Image Viewer-win32-x64\VideoAudioImageViewer.exe'
$ffmpegPath = Join-Path $projectPath 'bin\ffmpeg.exe'
$probeFolder = Join-Path $projectPath ('OUTPUT\shell_validation_' + (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'))
New-Item -ItemType Directory -Path $probeFolder -Force | Out-Null
$sourcePath = Join-Path $projectPath 'Test files\Preizkus lokalne pretvorbe - FFV1.avi'
$videoPath = Join-Path $probeFolder 'Preizkus privzetega videa.mkv'
$audioPath = Join-Path $probeFolder 'Preizkus privzetega zvoka.ogg'
$imagePath = Join-Path $probeFolder 'Preizkus privzete slike.avif'
& $ffmpegPath -v error -y -i $sourcePath -t 1 -c:v libx264 -c:a aac $videoPath
if ($LASTEXITCODE) { throw 'Video generation failed.' }
& $ffmpegPath -v error -y -i $sourcePath -t 1 -vn -c:a libvorbis $audioPath
if ($LASTEXITCODE) { throw 'Audio generation failed.' }
& $ffmpegPath -v error -y -i $sourcePath -frames:v 1 -an -c:v libaom-av1 -still-picture 1 $imagePath
if ($LASTEXITCODE) { throw 'Image generation failed.' }
$historyPath = Join-Path $projectPath 'DATA\history.json'
$report = @()
foreach ($filePath in @($sourcePath,$videoPath,$audioPath,$imagePath)) {
    $start = [DateTime]::UtcNow
    $errorText = $null
    try {
        if ($filePath -eq $sourcePath) {
            # The portable executable must work with Node/FFmpeg absent from PATH.
            $previousPath = $env:PATH
            try { $env:PATH = "$env:WINDIR\System32;$env:WINDIR"; Start-Process -FilePath $exePath -ArgumentList ('"' + $filePath + '"') -WorkingDirectory $projectPath -WindowStyle Hidden } finally { $env:PATH = $previousPath }
        } else { Start-Process -FilePath $filePath }
    } catch { $errorText = $_.Exception.Message }
    $opened = $false
    for ($attempt=0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 200
        try {
            $historyState = Get-Content -LiteralPath $historyPath -Raw -Encoding UTF8 | ConvertFrom-Json
            $opened = @($historyState.history | Where-Object { $_.path -eq $filePath -and [DateTime]::Parse($_.opened).ToUniversalTime() -ge $start }).Count -gt 0
        } catch { }
        if ($opened) { break }
    }
    $report += [pscustomobject]@{path=$filePath; method=$(if ($filePath -eq $sourcePath) {'portable executable with PATH limited to Windows'} else {'Windows ShellExecute via Start-Process'}); openedInViewer=$opened; error=$errorText}
}
@{checkedAt=[DateTime]::UtcNow.ToString('o');results=$report; note='An unsuccessful launch requires a user choice in Windows Default apps; registry entries alone are not evidence of success.'} | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $probeFolder 'report.json') -Encoding UTF8
$report | Format-Table method,openedInViewer,path -AutoSize

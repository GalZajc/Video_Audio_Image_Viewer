$ErrorActionPreference = 'Stop'
$projectPath = Split-Path -Parent $PSScriptRoot
$binPath = Join-Path $projectPath 'bin'
if ((Test-Path -LiteralPath (Join-Path $binPath 'ffmpeg.exe')) -and (Test-Path -LiteralPath (Join-Path $binPath 'ffprobe.exe'))) { return }
$setupPath = Join-Path $projectPath 'OUTPUT\dependencies'
New-Item -ItemType Directory -Path $setupPath -Force | Out-Null
New-Item -ItemType Directory -Path $binPath -Force | Out-Null
$archivePath = Join-Path $setupPath 'ffmpeg-8.1.2-essentials_build.zip'
$downloadUrl = 'https://www.gyan.dev/ffmpeg/builds/packages/ffmpeg-8.1.2-essentials_build.zip'
$expectedHash = 'db580001caa24ac104c8cb856cd113a87b0a443f7bdf47d8c12b1d740584a2ec'
Invoke-WebRequest -Uri $downloadUrl -OutFile $archivePath
if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $expectedHash) { throw 'FFmpeg archive checksum mismatch.' }
$unpackedPath = Join-Path $setupPath 'ffmpeg-8.1.2'
Expand-Archive -LiteralPath $archivePath -DestinationPath $unpackedPath -Force
$ffmpegFile = Get-ChildItem -LiteralPath $unpackedPath -Filter ffmpeg.exe -Recurse -File | Select-Object -First 1
$ffprobeFile = Get-ChildItem -LiteralPath $unpackedPath -Filter ffprobe.exe -Recurse -File | Select-Object -First 1
if (-not $ffmpegFile -or -not $ffprobeFile) { throw 'FFmpeg tools are missing from the archive.' }
Copy-Item -LiteralPath $ffmpegFile.FullName,$ffprobeFile.FullName -Destination $binPath
$licenseFile = Get-ChildItem -LiteralPath $unpackedPath -Filter LICENSE -Recurse -File | Select-Object -First 1
if ($licenseFile) { Copy-Item -LiteralPath $licenseFile.FullName -Destination (Join-Path $binPath 'FFmpeg-LICENSE.txt') }
[IO.File]::WriteAllText((Join-Path $binPath 'FFmpeg-SOURCE.txt'), "FFmpeg 8.1.2 essentials build: $downloadUrl`nSHA256: $expectedHash`nBuild information: https://www.gyan.dev/ffmpeg/builds/`nCorresponding upstream source: https://ffmpeg.org/releases/ffmpeg-8.1.2.tar.xz`nLicense: GPLv3 or later.`n", [Text.UTF8Encoding]::new($false))

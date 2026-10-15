$ErrorActionPreference='Stop'
$projectPath=Split-Path -Parent $PSScriptRoot
$compilerPath=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(!(Test-Path -LiteralPath $compilerPath)){throw 'The Windows .NET Framework C# compiler is unavailable.'}
[IO.Directory]::CreateDirectory((Join-Path $projectPath 'bin'))|Out-Null
& $compilerPath /nologo /optimize+ /target:exe /platform:x64 /reference:System.Drawing.dll /reference:System.Web.Extensions.dll (('/win32manifest:')+(Join-Path $projectPath 'ocr-worker.manifest')) (('/out:')+(Join-Path $projectPath 'bin\ViewerOcr.exe')) (Join-Path $projectPath 'ocr-worker.cs')
if($LASTEXITCODE -ne 0){throw 'OCR worker compilation failed.'}

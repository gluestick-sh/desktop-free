# Build shim.exe into build/bin (beside gluestick.exe after wails build).
$ErrorActionPreference = "Stop"
$env:GOWORK = "off"
if (-not $env:GOOS) { $env:GOOS = "windows" }

$repoRoot = Split-Path $PSScriptRoot -Parent
$shimSrc = Join-Path $PSScriptRoot "shim"
$outDir = Join-Path $repoRoot "build\bin"
$shimOut = Join-Path $outDir "shim.exe"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Write-Host "Building shim.exe -> $shimOut"
Push-Location $shimSrc
& go build -o $shimOut .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Pop-Location
Write-Host "shim.exe ready"

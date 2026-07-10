# Production build: wails + bundled shim.exe for standalone Desktop installs.
param(
    [string]$Platform = ""
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$env:GOWORK = "off"

$wailsArgs = @()
if ($Platform) {
    $wailsArgs += @("-platform", $Platform)
    $arch = ($Platform -split "/")[-1]
    if ($arch) {
        $env:GOOS = "windows"
        $env:GOARCH = $arch
    }
}

& wails build @wailsArgs @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& (Join-Path $PSScriptRoot "scripts\build-shim.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Done: build\bin\gluestick.exe + build\bin\shim.exe ($env:GOARCH)"

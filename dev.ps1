# Gluestick Desktop dev mode
# Workaround: wails dev fails on Windows ARM64 + Go 1.26 when -gcflags "all=-N -l" is set (white screen)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$env:GOWORK = "off"

function Resolve-NpmDirectory {
  $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
  if ($npmCmd) {
    return (Split-Path $npmCmd.Source -Parent)
  }
  $candidates = @(
    (Join-Path $env:ProgramFiles "nodejs"),
    (Join-Path ${env:ProgramFiles(x86)} "nodejs"),
    (Join-Path $env:LOCALAPPDATA "Programs\nodejs")
  )
  foreach ($dir in $candidates) {
    if (Test-Path (Join-Path $dir "npm.cmd")) {
      return $dir
    }
  }
  return $null
}

$npmDir = Resolve-NpmDirectory
if (-not $npmDir) {
  Write-Error @"
Node.js / npm not found in PATH.

Wails needs npm to compile the frontend. Please:
  1. Install Node.js 18+ from https://nodejs.org/
  2. Restart the terminal (or IDE) so PATH is refreshed
  3. Run from the repo root:  cd C:\github.com\desktop; .\dev.ps1

Verify:  node -v   and   npm -v
"@
}
if ($env:PATH -notlike "*$npmDir*") {
  $env:PATH = "$npmDir;$env:PATH"
}
Write-Host "Using npm from $npmDir"

& (Join-Path $PSScriptRoot "scripts\build-shim.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$glueRoot = Join-Path $env:USERPROFILE ".glue"
$glueShim = Join-Path $glueRoot "shim.exe"
$bundledShim = Join-Path $PSScriptRoot "build\bin\shim.exe"
if (-not (Test-Path $glueShim)) {
  New-Item -ItemType Directory -Force -Path $glueRoot | Out-Null
  Copy-Item -Force $bundledShim $glueShim
}

$compilerDir = Join-Path $PSScriptRoot "scripts\compiler"
$compilerExe = Join-Path $PSScriptRoot "scripts\go-dev.exe"

if (-not (Test-Path $compilerExe)) {
  Write-Host "Building go-dev compiler wrapper..."
  & go build -o $compilerExe $compilerDir
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# Pin Vite to port 5173 (strictPort); free the port before starting
Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.OwningProcess -gt 0 } |
  ForEach-Object {
    Write-Host "Stopping process on port 5173 (PID $($_.OwningProcess))..."
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
  }
Start-Sleep -Milliseconds 800

Write-Host "Preparing app icon..."
$buildDir = Join-Path $PSScriptRoot "build"
$appicon = Join-Path $buildDir "appicon.png"
$publicIcon = Join-Path $PSScriptRoot "frontend\public\appicon.png"
if (-not (Test-Path $appicon) -and (Test-Path $publicIcon)) {
  New-Item -ItemType Directory -Force -Path $buildDir | Out-Null
  Copy-Item -Force $publicIcon $appicon
}
if (Test-Path $appicon) {
  & go run ./scripts/fixappicon
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Remove-Item (Join-Path $PSScriptRoot "build\windows\icon.ico") -ErrorAction SilentlyContinue
} else {
  Write-Warning "No app icon at build/appicon.png or frontend/public/appicon.png; wails may use default icon."
}

& wails dev -compiler $compilerExe @args

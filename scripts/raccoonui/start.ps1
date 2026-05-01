#requires -Version 5.1
<#
.SYNOPSIS
  Launch RaccoonUI daemon + open browser. Usage-and-close mode.
.DESCRIPTION
  Sets OD_RESOURCE_ROOT=.raccoonui so daemon reads user-writable dir,
  spawns daemon on $env:OD_PORT (default 17456), waits for listen,
  opens default browser, then sits on the daemon process.
  Closing the console (Ctrl-C / window close) terminates the daemon.
#>

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$RaccoonUIDir = (Resolve-Path "$PSScriptRoot\..\..").Path
$Port = if ($env:OD_PORT) { [int]$env:OD_PORT } else { 17456 }

Push-Location $RaccoonUIDir
try {
    if (-not (Test-Path "apps\daemon\dist\cli.js")) {
        Write-Host "❌ daemon 還沒 build — 先跑 install.ps1" -ForegroundColor Red
        exit 1
    }

    $env:OD_RESOURCE_ROOT = ".raccoonui"
    $env:OD_PORT = $Port

    Write-Host "🦝 RaccoonUI starting on http://127.0.0.1:$Port/" -ForegroundColor Cyan

    $daemon = Start-Process -FilePath "node" `
        -ArgumentList "apps\daemon\dist\cli.js","--no-open","--port",$Port `
        -PassThru -NoNewWindow

    # Wait for listen
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/design-systems" `
                -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200) { $ready = $true; break }
        } catch { }
        Start-Sleep -Seconds 1
    }

    if (-not $ready) {
        Write-Host "❌ daemon 啟動 timeout (30s)" -ForegroundColor Red
        Stop-Process -Id $daemon.Id -Force -ErrorAction SilentlyContinue
        exit 1
    }

    Write-Host "✅ daemon ready, opening browser..." -ForegroundColor Green
    Start-Process "http://127.0.0.1:$Port/"

    # Sit on daemon — exits when daemon exits or user kills the console
    Wait-Process -Id $daemon.Id
} finally {
    if ($daemon -and -not $daemon.HasExited) {
        Stop-Process -Id $daemon.Id -Force -ErrorAction SilentlyContinue
    }
    Pop-Location
}

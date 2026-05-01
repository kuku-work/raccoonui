#requires -Version 5.1
<#
.SYNOPSIS
  Update RaccoonUI fork — git pull origin/main + reinstall + rebuild.
.NOTES
  origin/main is updated by kuku after running daily upstream-audit
  (slack-bot/jobs.json: raccoonui-upstream-audit). Coworkers run this
  whenever Slack posts "新版可用".
#>

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$RaccoonUIDir = (Resolve-Path "$PSScriptRoot\..\..").Path

Push-Location $RaccoonUIDir
try {
    Write-Host "🔄 Fetching latest from origin..." -ForegroundColor Cyan
    git fetch origin --quiet

    $local = git rev-parse main
    $remote = git rev-parse origin/main

    if ($local -eq $remote) {
        Write-Host "✅ already up-to-date ($($local.Substring(0,8)))" -ForegroundColor Green
        exit 0
    }

    Write-Host "Pulling..." -ForegroundColor Cyan
    git pull origin main --ff-only

    Write-Host "📦 Refreshing dependencies..." -ForegroundColor Cyan
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }

    Write-Host "🔨 Rebuilding..." -ForegroundColor Cyan
    pnpm -r --workspace-concurrency=1 build
    if ($LASTEXITCODE -ne 0) { throw "build failed" }

    $newHead = git rev-parse --short HEAD
    Write-Host ""
    Write-Host "✅ RaccoonUI updated to $newHead" -ForegroundColor Green
    Write-Host "   重啟: pwsh -File scripts\raccoonui\start.ps1" -ForegroundColor Cyan
} finally {
    Pop-Location
}

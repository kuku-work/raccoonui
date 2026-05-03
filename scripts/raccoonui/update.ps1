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

    # Re-link Claude Code skills (claude-skills/ → ~/.claude/commands/)
    $skillsSrc = Join-Path $RaccoonUIDir 'claude-skills'
    if (Test-Path $skillsSrc) {
        $cmdsDst = Join-Path $env:USERPROFILE '.claude\commands'
        New-Item -ItemType Directory -Path $cmdsDst -Force | Out-Null
        $linked = 0
        foreach ($f in Get-ChildItem $skillsSrc -Filter '*.md') {
            $dst = Join-Path $cmdsDst $f.Name
            if (Test-Path $dst) { Remove-Item $dst -Force }
            try {
                New-Item -ItemType SymbolicLink -Path $dst -Target $f.FullName -ErrorAction Stop | Out-Null
            } catch {
                Copy-Item -Path $f.FullName -Destination $dst -Force
            }
            $linked++
        }
        Write-Host "✅ Re-linked $linked Claude Code skill(s)" -ForegroundColor Green
    }

    $newHead = git rev-parse --short HEAD
    Write-Host ""
    Write-Host "✅ RaccoonUI updated to $newHead" -ForegroundColor Green
    Write-Host "   重啟: pwsh -File scripts\raccoonui\start.ps1" -ForegroundColor Cyan
} finally {
    Pop-Location
}

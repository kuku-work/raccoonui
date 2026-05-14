#requires -Version 5.1
<#
.SYNOPSIS
  RaccoonUI bootstrap — clone fork + run install in one step.
.DESCRIPTION
  Usage:
    iwr -useb https://raw.githubusercontent.com/kuku-work/raccoonui/main/scripts/raccoonui/bootstrap.ps1 | iex

  Override target dir:
    $env:RACCOONUI_DIR = 'D:\path\to\dir'; iwr -useb ... | iex
#>

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$repo = "https://github.com/kuku-work/raccoonui.git"
$target = if ($env:RACCOONUI_DIR) { $env:RACCOONUI_DIR } else { "$env:USERPROFILE\RaccoonUI" }

Write-Host "🦝 RaccoonUI bootstrap" -ForegroundColor Cyan
Write-Host "  target: $target" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ git not found — install it then re-run bootstrap:" -ForegroundColor Red
    Write-Host "    winget install Git.Git" -ForegroundColor Yellow
    Write-Host "    or download from https://git-scm.com" -ForegroundColor Yellow
    exit 1
}

if (Test-Path "$target\.git") {
    Write-Host "→ existing fork at $target — switching to main + pulling latest" -ForegroundColor Cyan
    Push-Location $target
    try {
        git checkout main
        if ($LASTEXITCODE -ne 0) { throw "git checkout main failed" }
        git pull origin main --ff-only
        if ($LASTEXITCODE -ne 0) { throw "git pull failed" }
    } finally {
        Pop-Location
    }
} else {
    if (Test-Path $target) {
        Write-Host "❌ $target exists but is not a git repo. Move it aside or set `$env:RACCOONUI_DIR." -ForegroundColor Red
        exit 1
    }
    # Explicit --branch main: coworkers track main; kuku-only work lives in dev.
    git clone --branch main $repo $target
    if ($LASTEXITCODE -ne 0) { throw "git clone failed" }
}

Write-Host ""
Write-Host "→ running install.ps1" -ForegroundColor Cyan
& "$target\scripts\raccoonui\install.ps1"

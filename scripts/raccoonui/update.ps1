#requires -Version 5.1
<#
.SYNOPSIS
  Update RaccoonUI fork — git pull current branch + reinstall + rebuild +
  top up missing .raccoonui/ resources.
.NOTES
  origin/<branch> is updated by kuku after running daily upstream-audit
  (slack-bot/jobs.json: raccoonui-upstream-audit). Coworkers run this
  whenever Slack posts "新版可用". Detects whichever branch the user is
  on rather than hardcoding `main` so kuku's dev workflow and coworkers
  on `main` both work without surprise.
#>

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$RaccoonUIDir = (Resolve-Path "$PSScriptRoot\..\..").Path

# Resource layers seeded into .raccoonui/ for the packaged release path
# (dev mode start.ps1 reads from repo root, not .raccoonui/). Mirrors the
# list in install.ps1 so update can top up directories the user never had
# (e.g. upstream added skills/ + prompt-templates/ but install.ps1 had only
# seeded design-systems/ in older revisions).
$RaccoonUIResources = @(
    @{ src = 'design-systems';        dst = 'design-systems' },
    @{ src = 'skills';                dst = 'skills' },
    @{ src = 'design-templates';      dst = 'design-templates' },
    @{ src = 'craft';                 dst = 'craft' },
    @{ src = 'assets/frames';         dst = 'frames' },
    @{ src = 'assets/community-pets'; dst = 'community-pets' },
    @{ src = 'prompt-templates';      dst = 'prompt-templates' }
)

function Seed-MissingRaccoonUIResources {
    param([string]$Root)
    foreach ($r in $RaccoonUIResources) {
        $srcPath = Join-Path $Root ($r.src -replace '/', '\')
        $dstPath = Join-Path $Root (".raccoonui\$($r.dst)")
        if (-not (Test-Path $srcPath)) { continue }
        if (Test-Path $dstPath) { continue }
        Write-Host "→ Seeding missing .raccoonui/$($r.dst)/..." -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $dstPath -Force | Out-Null
        Copy-Item -Path (Join-Path $srcPath '*') -Destination $dstPath -Recurse -Force
        Write-Host "✅ .raccoonui/$($r.dst)/ seeded" -ForegroundColor Green
    }
}

Push-Location $RaccoonUIDir
try {
    # Branch detection — user might be on main, dev, or a feature branch.
    $branch = (git rev-parse --abbrev-ref HEAD 2>$null | Out-String).Trim()
    if ([string]::IsNullOrEmpty($branch) -or $branch -eq 'HEAD') {
        Write-Host "❌ Cannot detect current branch (detached HEAD?)" -ForegroundColor Red
        Write-Host "   Check out a branch first: git checkout main" -ForegroundColor Yellow
        exit 1
    }

    Write-Host "🔄 Fetching latest from origin (branch: $branch)..." -ForegroundColor Cyan
    git fetch origin --quiet

    git rev-parse "origin/$branch" 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ origin/$branch does not exist — local-only branch?" -ForegroundColor Red
        Write-Host "   Push it first or switch to a tracked branch." -ForegroundColor Yellow
        exit 1
    }

    $local = git rev-parse $branch
    $remote = git rev-parse "origin/$branch"

    if ($local -eq $remote) {
        Write-Host "✅ already up-to-date ($($local.Substring(0,8)) on $branch)" -ForegroundColor Green
        # Still top up missing resources — handles older installs where
        # install.ps1 only seeded design-systems and never backfilled.
        Seed-MissingRaccoonUIResources $RaccoonUIDir
        exit 0
    }

    Write-Host "Pulling origin/$branch..." -ForegroundColor Cyan
    git pull origin $branch --ff-only

    Write-Host "📦 Refreshing dependencies..." -ForegroundColor Cyan
    pnpm install
    if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }

    Write-Host "🔨 Rebuilding..." -ForegroundColor Cyan
    pnpm -r --workspace-concurrency=1 build
    if ($LASTEXITCODE -ne 0) { throw "build failed" }

    # Top up any .raccoonui/ resource the user is still missing.
    Seed-MissingRaccoonUIResources $RaccoonUIDir

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

    # Re-stamp desktop shortcut so existing users pick up icon / target changes.
    # Only refresh if the user already has the shortcut on Desktop — never
    # create a new one if they removed/relocated it.
    $existingShortcut = Join-Path ([Environment]::GetFolderPath('Desktop')) 'RaccoonUI.lnk'
    if (Test-Path $existingShortcut) {
        $makeShortcut = Join-Path $RaccoonUIDir 'scripts\raccoonui\make-shortcut.ps1'
        if (Test-Path $makeShortcut) {
            try {
                & pwsh -File $makeShortcut | Out-Null
                Write-Host "✅ Refreshed desktop shortcut (icon/target)" -ForegroundColor Green
            } catch {
                Write-Host "⚠️  shortcut refresh failed (non-fatal): $_" -ForegroundColor Yellow
            }
        }
    }

    $newHead = git rev-parse --short HEAD
    Write-Host ""
    Write-Host "✅ RaccoonUI updated to $newHead" -ForegroundColor Green
    Write-Host "   重啟: pwsh -File scripts\raccoonui\start.ps1" -ForegroundColor Cyan
} finally {
    Pop-Location
}

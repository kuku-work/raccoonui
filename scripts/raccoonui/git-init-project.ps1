#requires -Version 5.1
<#
.SYNOPSIS
  Initialize a raccoonui project, init git, create private GitHub repo, push.
.DESCRIPTION
  Slug-based id (validated). Creates project via daemon, runs git/init,
  creates a private GitHub repo under the user's own account, pushes.
.PARAMETER Slug
  Project id (regex: [A-Za-z0-9._-]{1,128}).
.PARAMETER Name
  Display name (defaults to slug).
.NOTES
  Requires daemon running (start.ps1) and gh CLI authed (gh auth status).
  RACCOONUI_PORT env var overrides daemon port (default 17456).
#>
param(
    [Parameter(Mandatory = $true, Position = 0)] [string]$Slug,
    [Parameter(Position = 1)] [string]$Name = ''
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

if (-not $Name) { $Name = $Slug }

# Match daemon validator: /^[A-Za-z0-9._-]{1,128}$/
if ($Slug -notmatch '^[A-Za-z0-9._-]{1,128}$') {
    Write-Host "❌ invalid slug: must match [A-Za-z0-9._-] and be 1-128 chars" -ForegroundColor Red
    exit 1
}

$RaccoonUIDir = (Resolve-Path "$PSScriptRoot\..\..").Path
$Port = if ($env:RACCOONUI_PORT) { [int]$env:RACCOONUI_PORT } else { 17456 }
$Base = "http://127.0.0.1:$Port"

# --- 0. preflight ----------------------------------------------------------
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ gh CLI not installed — install from https://cli.github.com/" -ForegroundColor Red
    exit 1
}
& gh auth status 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ gh CLI not authenticated — run: gh auth login" -ForegroundColor Red
    exit 1
}
# Ensure git uses gh CLI as credential helper. Without this, `git push` to
# a private repo returns 404 Not Found (GitHub hides existence of private
# repos from unauthenticated requests). Idempotent — safe to re-run.
& gh auth setup-git 2>&1 | Out-Null
try {
    Invoke-WebRequest -Uri "$Base/api/design-systems" -UseBasicParsing -TimeoutSec 3 | Out-Null
} catch {
    Write-Host "❌ daemon not running on port $Port — start it first: pwsh -File scripts\raccoonui\start.ps1" -ForegroundColor Red
    exit 1
}

$ghUser = (& gh api user --jq .login).Trim()
$repoName = "raccoonui-proj-$Slug"
$projectDir = Join-Path $RaccoonUIDir ".od\projects\$Slug"

# --- 1. create project -----------------------------------------------------
Write-Host "📝 creating project '$Name' (slug=$Slug)..." -ForegroundColor Cyan
$createBody = @{ id = $Slug; name = $Name } | ConvertTo-Json -Compress
try {
    $createRes = Invoke-RestMethod -Uri "$Base/api/projects" -Method Post `
        -ContentType 'application/json' -Body $createBody
} catch {
    Write-Host "❌ POST /api/projects failed: $_" -ForegroundColor Red
    exit 1
}

# --- 2. git/init via daemon ------------------------------------------------
Write-Host "🔧 git init..." -ForegroundColor Cyan
$initRes = Invoke-RestMethod -Uri "$Base/api/raccoonui/projects/$Slug/git/init" -Method Post
Write-Host "  $($initRes | ConvertTo-Json -Compress)"

# --- 3. gh repo create -----------------------------------------------------
Write-Host "🚀 gh repo create $ghUser/$repoName (private)..." -ForegroundColor Cyan
& gh repo view "$ghUser/$repoName" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ⚠️  repo already exists on GitHub — skipping create"
    $hasOrigin = $false
    Push-Location $projectDir
    try {
        & git remote get-url origin 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { $hasOrigin = $true }
    } finally {
        Pop-Location
    }
    if (-not $hasOrigin) {
        $repoUrl = (& gh repo view "$ghUser/$repoName" --json sshUrl --jq .sshUrl).Trim()
        & git -C $projectDir remote add origin $repoUrl
        Write-Host "  added existing repo as origin: $repoUrl"
    }
} else {
    & gh repo create $repoName --private --source=$projectDir --remote=origin --push=$false 2>&1 | Select-Object -Last 1
    # Verify repo actually exists on GitHub — gh has been observed to
    # print a URL even when the API call silently failed.
    Start-Sleep -Seconds 1
    & gh repo view "$ghUser/$repoName" 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ gh repo create reported success but repo not found on GitHub" -ForegroundColor Red
        Write-Host "   diagnostics:"
        Write-Host "     gh login: $((& gh api user --jq .login 2>$null))"
        Write-Host "     gh version: $((& gh --version 2>$null | Select-Object -First 1))"
        Write-Host "   try manual: gh repo create $repoName --private --source=$projectDir"
        exit 1
    }
}

# --- 4. push via daemon ----------------------------------------------------
Write-Host "📤 git push..." -ForegroundColor Cyan
try {
    $pushRes = Invoke-RestMethod -Uri "$Base/api/raccoonui/projects/$Slug/git/push" -Method Post
    if ($pushRes.pushed) {
        Write-Host "  ✅ pushed" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  push response: $($pushRes | ConvertTo-Json -Compress)"
    }
} catch {
    Write-Host "  ⚠️  push failed: $_" -ForegroundColor Yellow
}

# --- 5. summary ------------------------------------------------------------
Write-Host ""
Write-Host "✅ done" -ForegroundColor Green
Write-Host "   project:   $projectDir"
Write-Host "   GitHub:    https://github.com/$ghUser/$repoName"
Write-Host ""
Write-Host "   next:"
Write-Host "     - open RaccoonUI, picker shows '$Name'"
Write-Host "     - commit:   Invoke-RestMethod $Base/api/raccoonui/projects/$Slug/git/commit -Method Post -ContentType application/json -Body '{`"message`":`"...`"}'"
Write-Host "     - push:     Invoke-RestMethod $Base/api/raccoonui/projects/$Slug/git/push -Method Post"
Write-Host "     - history:  Invoke-RestMethod $Base/api/raccoonui/projects/$Slug/git/history"

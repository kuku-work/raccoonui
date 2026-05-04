#requires -Version 5.1
<#
.SYNOPSIS
  Clone a raccoonui project from git URL and import into local raccoonui.
.DESCRIPTION
  Counterpart to git-init-project.ps1 on the receiving end. Clones the repo
  into a temp dir, reads the slug from .raccoonui-project.json, moves the
  repo into .od/projects/<slug>/, and triggers daemon import-fs.
.PARAMETER RepoUrl
  Git URL (https or ssh) of a repo created by git-init-project.
.NOTES
  Requires daemon running (start.ps1) and git CLI installed.
  RACCOONUI_PORT env var overrides daemon port (default 17456).
#>
param(
    [Parameter(Mandatory = $true, Position = 0)] [string]$RepoUrl
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$RaccoonUIDir = (Resolve-Path "$PSScriptRoot\..\..").Path
$Port = if ($env:RACCOONUI_PORT) { [int]$env:RACCOONUI_PORT } else { 17456 }
$Base = "http://127.0.0.1:$Port"

# --- 0. preflight ----------------------------------------------------------
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ git not installed" -ForegroundColor Red
    exit 1
}
# If gh CLI is around, ensure git uses it as credential helper — required
# for cloning private repos via https.
if (Get-Command gh -ErrorAction SilentlyContinue) {
    & gh auth status 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        & gh auth setup-git 2>&1 | Out-Null
    }
}
try {
    Invoke-WebRequest -Uri "$Base/api/design-systems" -UseBasicParsing -TimeoutSec 3 | Out-Null
} catch {
    Write-Host "❌ daemon not running on port $Port — start it first: pwsh -File scripts\raccoonui\start.ps1" -ForegroundColor Red
    exit 1
}

$ProjectsDir = Join-Path $RaccoonUIDir ".od\projects"
New-Item -ItemType Directory -Path $ProjectsDir -Force | Out-Null

# --- 1. clone to a temp dir ------------------------------------------------
$TempBase = Join-Path ([System.IO.Path]::GetTempPath()) ("raccoonui-clone-" + [System.IO.Path]::GetRandomFileName())
New-Item -ItemType Directory -Path $TempBase | Out-Null
$TempRepo = Join-Path $TempBase 'repo'

try {
    Write-Host "📥 cloning $RepoUrl..." -ForegroundColor Cyan
    & git clone --quiet $RepoUrl $TempRepo
    if ($LASTEXITCODE -ne 0) { throw "git clone failed (exit $LASTEXITCODE)" }

    $sidecar = Join-Path $TempRepo '.raccoonui-project.json'
    if (-not (Test-Path $sidecar)) {
        Write-Host "❌ this repo has no .raccoonui-project.json — not a raccoonui project" -ForegroundColor Red
        exit 1
    }

    # --- 2. extract slug from sidecar ------------------------------------
    $sidecarJson = Get-Content -Path $sidecar -Raw -Encoding UTF8 | ConvertFrom-Json
    $slug = $sidecarJson.id
    $name = $sidecarJson.name
    if (-not $slug) {
        Write-Host "❌ sidecar missing 'id' field" -ForegroundColor Red
        exit 1
    }
    if ($slug -notmatch '^[A-Za-z0-9._-]{1,128}$') {
        Write-Host "❌ sidecar slug invalid: $slug" -ForegroundColor Red
        exit 1
    }

    $dest = Join-Path $ProjectsDir $slug
    if (Test-Path $dest) {
        Write-Host "❌ project already exists locally: $dest" -ForegroundColor Red
        Write-Host "   if you want to update from remote, cd into it and run: git pull"
        exit 1
    }

    # --- 3. move into place ---------------------------------------------
    Move-Item -Path $TempRepo -Destination $dest
    Write-Host "📂 placed at $dest" -ForegroundColor Green

    # --- 4. trigger import-fs -------------------------------------------
    Write-Host "🔄 triggering daemon import-fs..." -ForegroundColor Cyan
    $importRes = Invoke-RestMethod -Uri "$Base/api/raccoonui/projects/import-fs" -Method Post
    Write-Host "  $($importRes | ConvertTo-Json -Compress)"

    # --- 5. summary -----------------------------------------------------
    if (-not $name) { $name = $slug }
    Write-Host ""
    Write-Host "✅ done" -ForegroundColor Green
    Write-Host "   project:   $dest"
    Write-Host "   name:      $name"
    Write-Host "   slug:      $slug"
    Write-Host ""
    Write-Host "   open RaccoonUI — picker should show '$name'."
    Write-Host "   pull updates later: git -C $dest pull"
} finally {
    if (Test-Path $TempBase) {
        Remove-Item -Path $TempBase -Recurse -Force -ErrorAction SilentlyContinue
    }
}

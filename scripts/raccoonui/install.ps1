#requires -Version 5.1
<#
.SYNOPSIS
  RaccoonUI installer for Windows.
.DESCRIPTION
  Detects node 22+, git, pnpm, and Visual Studio C++ Build Tools workload
  (required by better-sqlite3 native compilation). Installs missing
  components when possible, then installs deps, seeds .raccoonui/, and
  builds daemon + web.
.NOTES
  Run from any cwd; resolves fork root from script location.
  Requires PowerShell 5.1+ (built into Windows 10+) or pwsh 7+.
#>

$ErrorActionPreference = 'Stop'
# Force UTF-8 output so emoji + 中文 render correctly across PowerShell 5/7 +
# legacy cmd consoles. Without this, Win10/11 default cp950/cp936 mangles them.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$RaccoonUIDir = (Resolve-Path "$PSScriptRoot\..\..").Path
$ErrCount = 0

function Step { param([string]$m) Write-Host "→ $m" -ForegroundColor Cyan }
function Ok   { param([string]$m) Write-Host "✅ $m" -ForegroundColor Green }
function Fail {
    param([string]$m, [string]$hint)
    Write-Host "❌ $m" -ForegroundColor Red
    if ($hint) { Write-Host "   $hint" -ForegroundColor Yellow }
    $script:ErrCount++
}

# ── 1. node 22+ ──
if (Get-Command node -ErrorAction SilentlyContinue) {
    $v = (node -v).TrimStart('v')
    $major = [int]$v.Split('.')[0]
    if ($major -lt 22) {
        Fail "node $v 太舊，需要 v22+" "winget install OpenJS.NodeJS.LTS"
    } else {
        Ok "node $v"
    }
} else {
    Fail "node 未安裝" "winget install OpenJS.NodeJS.LTS"
}

# ── 2. git ──
if (Get-Command git -ErrorAction SilentlyContinue) {
    Ok "git ($(git --version))"
} else {
    Fail "git 未安裝" "winget install Git.Git"
}

# ── 3. pnpm ──
if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    Ok "pnpm ($(pnpm -v))"
} elseif (Get-Command npm -ErrorAction SilentlyContinue) {
    Step "Installing pnpm via npm..."
    npm install -g pnpm 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Fail "pnpm 安裝失敗" "manual: npm install -g pnpm"
    } else {
        Ok "pnpm $(pnpm -v)"
    }
} else {
    Fail "pnpm 未安裝且找不到 npm" "先裝 node (winget install OpenJS.NodeJS.LTS)"
}

# ── 4. VS C++ Build Tools (better-sqlite3 native compile) ──
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$hasVCTools = $false
if (Test-Path $vswhere) {
    $vcPath = & $vswhere -latest -products '*' `
        -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
        -property installationPath 2>$null
    if ($vcPath) {
        Ok "VS C++ Build Tools at $vcPath"
        $hasVCTools = $true
    }
}
if (-not $hasVCTools) {
    Write-Host "❌ Visual Studio C++ Desktop Workload 未安裝" -ForegroundColor Red
    Write-Host "   better-sqlite3 native binding 需要本地 compile，必須裝 VC++ tools" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   選 1（推薦）— winget 自動裝（可能要 admin elevation）：" -ForegroundColor Yellow
    Write-Host "     winget install Microsoft.VisualStudio.2022.BuildTools --override `"--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --quiet`"" -ForegroundColor White
    Write-Host ""
    Write-Host "   選 2 — 開 VS Installer GUI 修改既有 VS 安裝，勾「Desktop development with C++」" -ForegroundColor Yellow
    Write-Host ""
    $script:ErrCount++
}

if ($ErrCount -gt 0) {
    Write-Host ""
    Write-Host "⚠️  $ErrCount issue(s) detected — fix above and re-run." -ForegroundColor Yellow
    exit 1
}

# ── 5. Install deps ──
Push-Location $RaccoonUIDir
try {
    Step "pnpm install..."
    pnpm install 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }

    # ── 6. Seed .raccoonui/design-systems/ ──
    $dsDir = Join-Path $RaccoonUIDir ".raccoonui\design-systems"
    if (-not (Test-Path $dsDir)) {
        Step "Seeding .raccoonui/design-systems/..."
        New-Item -ItemType Directory -Path $dsDir -Force | Out-Null
        Copy-Item -Path "$RaccoonUIDir\design-systems\*" -Destination $dsDir -Recurse -Force
        $count = (Get-ChildItem $dsDir -Directory).Count
        Ok "seeded $count design systems"
    } else {
        Ok "user dir exists at $dsDir (skipped seed)"
    }

    # ── 7. Build ──
    Step "Building daemon + web (this takes ~1-2 min)..."
    pnpm -r --workspace-concurrency=1 build 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "build failed" }

    # ── 8. Optional shortcut creator ──
    $shortcutScript = Join-Path $PSScriptRoot "make-shortcut.ps1"
    if (Test-Path $shortcutScript) {
        Step "Creating desktop shortcut..."
        & $shortcutScript
    }
} finally {
    Pop-Location
}

Write-Host ""
Ok "RaccoonUI 安裝完成!"
Write-Host ""
Write-Host "  啟動: pwsh -File scripts\raccoonui\start.ps1" -ForegroundColor Cyan
Write-Host "  更新: pwsh -File scripts\raccoonui\update.ps1" -ForegroundColor Cyan
Write-Host ""

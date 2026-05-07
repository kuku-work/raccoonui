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

# OS guard — PowerShell 7+ runs on macOS/Linux too. Bounce them to install.sh.
if ($PSVersionTable.PSVersion.Major -ge 6 -and -not $IsWindows) {
    Write-Host "❌ 這個 script 是 Windows 用的。macOS / Linux 請跑：" -ForegroundColor Red
    Write-Host "    ./scripts/raccoonui/install.sh" -ForegroundColor Yellow
    exit 1
}

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

# Resource layers daemon expects under OD_RESOURCE_ROOT (= .raccoonui/).
# `src` is repo-relative; `dst` is .raccoonui-relative (matches the
# segment names baked into apps/daemon/src/server.ts —
# resolveDaemonResourceDir).
$RaccoonUIResources = @(
    @{ src = 'design-systems';        dst = 'design-systems' },
    @{ src = 'skills';                dst = 'skills' },
    @{ src = 'craft';                 dst = 'craft' },
    @{ src = 'assets/frames';         dst = 'frames' },
    @{ src = 'assets/community-pets'; dst = 'community-pets' },
    @{ src = 'prompt-templates';      dst = 'prompt-templates' }
)

function Seed-RaccoonUIResources {
    param([string]$Root)
    foreach ($r in $RaccoonUIResources) {
        $srcPath = Join-Path $Root ($r.src -replace '/', '\')
        $dstPath = Join-Path $Root (".raccoonui\$($r.dst)")
        if (-not (Test-Path $srcPath)) {
            Write-Host "⚠️  source missing: $($r.src) (resource not seeded)" -ForegroundColor DarkYellow
            continue
        }
        if (Test-Path $dstPath) {
            Ok ".raccoonui/$($r.dst)/ already present (skipped)"
            continue
        }
        Step "Seeding .raccoonui/$($r.dst)/..."
        New-Item -ItemType Directory -Path $dstPath -Force | Out-Null
        Copy-Item -Path (Join-Path $srcPath '*') -Destination $dstPath -Recurse -Force
        $count = (Get-ChildItem $dstPath -Directory -ErrorAction SilentlyContinue | Measure-Object).Count
        Ok ".raccoonui/$($r.dst)/ seeded ($count entries)"
    }
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
$vsInstallerDir = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer"
$vswhere = "$vsInstallerDir\vswhere.exe"
$setup = "$vsInstallerDir\setup.exe"
$hasVCTools = $false
$existingVS = $null

if (Test-Path $vswhere) {
    $vcPath = & $vswhere -latest -products '*' `
        -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 `
        -property installationPath 2>$null
    if ($vcPath) {
        Ok "VS C++ Build Tools at $vcPath"
        $hasVCTools = $true
    } else {
        # vswhere works but VCTools workload missing — find any VS install to modify
        $existingVS = & $vswhere -latest -products '*' -property installationPath 2>$null |
            Select-Object -First 1
    }
}

if (-not $hasVCTools) {
    Write-Host "❌ Visual Studio C++ Desktop Workload 未安裝" -ForegroundColor Red
    Write-Host "   better-sqlite3 native binding 需要本地 compile，必須裝 VC++ tools" -ForegroundColor Yellow
    Write-Host ""
    if ($existingVS) {
        # VS exists, just missing the workload — use setup.exe modify
        Write-Host "   你已有 VS at: $existingVS" -ForegroundColor Yellow
        Write-Host "   執行（admin pwsh，~5–15min + 進度條）加 C++ workload：" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "     & `"$setup`" modify ``" -ForegroundColor White
        Write-Host "         --installPath `"$existingVS`" ``" -ForegroundColor White
        Write-Host "         --add Microsoft.VisualStudio.Workload.VCTools ``" -ForegroundColor White
        Write-Host "         --includeRecommended --passive --norestart" -ForegroundColor White
        Write-Host ""
        Write-Host "   ⚠️  winget install 對「已存在的 VS」不會 auto-add workload，只能用 setup.exe modify" -ForegroundColor DarkYellow
    } else {
        # No VS at all — fresh install
        Write-Host "   執行（admin pwsh，~10–30min）裝 BuildTools + C++ workload：" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "     winget install Microsoft.VisualStudio.2022.BuildTools --override `"--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --quiet`"" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "   或 GUI: 開 Visual Studio Installer → 修改 → 勾「Desktop development with C++」" -ForegroundColor Yellow
    Write-Host "   裝完重新跑 install.ps1" -ForegroundColor Yellow
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

    # ── 6. Seed .raccoonui/ resource layers ──
    # start.ps1 sets OD_RESOURCE_ROOT=.raccoonui, which makes the daemon
    # resolve EVERY resource segment under that dir (skills, design-systems,
    # craft, frames, community-pets, prompt-templates). Seed each one from
    # the matching repo path; dir-already-exists → skip so user-edits in
    # .raccoonui/ are preserved across re-runs.
    Seed-RaccoonUIResources $RaccoonUIDir

    # ── 7. Build ──
    Step "Building daemon + web (this takes ~1-2 min)..."
    pnpm -r --workspace-concurrency=1 build 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "build failed" }

    # ── 7.5. Link Claude Code skills (claude-skills/ → ~/.claude/commands/) ──
    $skillsSrc = Join-Path $RaccoonUIDir 'claude-skills'
    if (Test-Path $skillsSrc) {
        $cmdsDst = Join-Path $env:USERPROFILE '.claude\commands'
        New-Item -ItemType Directory -Path $cmdsDst -Force | Out-Null
        $linked = 0
        foreach ($f in Get-ChildItem $skillsSrc -Filter '*.md') {
            $dst = Join-Path $cmdsDst $f.Name
            if (Test-Path $dst) { Remove-Item $dst -Force }
            try {
                # Symlink needs admin or Developer Mode (Win10 1703+); falls back to copy.
                New-Item -ItemType SymbolicLink -Path $dst -Target $f.FullName -ErrorAction Stop | Out-Null
            } catch {
                Copy-Item -Path $f.FullName -Destination $dst -Force
            }
            $linked++
        }
        Ok "Linked $linked Claude Code skill(s) into $cmdsDst"
    }

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

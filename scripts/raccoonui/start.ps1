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

# Brand the console window: replace cmd.exe icon in taskbar / Alt-Tab / window
# corner with raccoonui.ico. Best-effort — failure is non-fatal (e.g. when
# stdout is redirected and there is no console handle).
$IconPath = Join-Path $RaccoonUIDir 'assets\raccoonui.ico'
if (Test-Path $IconPath) {
    try {
        Add-Type -Namespace RaccoonUI -Name Win32 -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern System.IntPtr GetConsoleWindow();
[System.Runtime.InteropServices.DllImport("user32.dll", CharSet = System.Runtime.InteropServices.CharSet.Auto)]
public static extern System.IntPtr LoadImage(System.IntPtr hInst, string name, uint type, int cx, int cy, uint fuLoad);
[System.Runtime.InteropServices.DllImport("user32.dll")]
public static extern System.IntPtr SendMessage(System.IntPtr hWnd, uint msg, System.IntPtr wParam, System.IntPtr lParam);
'@ -ErrorAction SilentlyContinue
        $hWnd = [RaccoonUI.Win32]::GetConsoleWindow()
        if ($hWnd -ne [System.IntPtr]::Zero) {
            # IMAGE_ICON=1, LR_LOADFROMFILE=0x10, WM_SETICON=0x80, ICON_SMALL=0, ICON_BIG=1
            $hIconSmall = [RaccoonUI.Win32]::LoadImage([System.IntPtr]::Zero, $IconPath, 1, 16, 16, 0x10)
            $hIconBig   = [RaccoonUI.Win32]::LoadImage([System.IntPtr]::Zero, $IconPath, 1, 32, 32, 0x10)
            [void][RaccoonUI.Win32]::SendMessage($hWnd, 0x80, [System.IntPtr]0, $hIconSmall)
            [void][RaccoonUI.Win32]::SendMessage($hWnd, 0x80, [System.IntPtr]1, $hIconBig)
        }
    } catch {
        # silently ignore — console branding is decorative, never block startup
    }
}

Push-Location $RaccoonUIDir
try {
    if (-not (Test-Path "apps\daemon\dist\cli.js")) {
        Write-Host "❌ daemon 還沒 build — 先跑 install.ps1" -ForegroundColor Red
        exit 1
    }

    # ── pre-start update check ──
    # Notify-only: prompts but never auto-pulls without consent. Detect phase
    # is best-effort (network errors / detached HEAD / no upstream branch
    # silently skip); the update phase, once user picks Y, fails loud so the
    # user never starts a half-rebuilt daemon. Default after 30s of no input
    # is N → start with current build.
    $detectOk = $true
    $branch = $null
    $behind = 0
    try {
        $branch = (git rev-parse --abbrev-ref HEAD 2>$null | Out-String).Trim()
        if (-not $branch -or $branch -eq 'HEAD') { $detectOk = $false }
        if ($detectOk) {
            git fetch origin --quiet 2>$null
            if ($LASTEXITCODE -ne 0) { $detectOk = $false }
        }
        if ($detectOk) {
            $countStr = (git rev-list --count "${branch}..origin/$branch" 2>$null | Out-String).Trim()
            if ([string]::IsNullOrEmpty($countStr)) { $detectOk = $false }
            else { $behind = [int]$countStr }
        }
    } catch {
        $detectOk = $false
    }

    if ($detectOk -and $behind -gt 0) {
        Write-Host ""
        Write-Host "⚠️  origin/$branch 領先本地 $behind commits — 建議更新" -ForegroundColor Yellow
        Write-Host "   立即更新? [Y/n]  (30 秒未輸入 → 直接啟動)" -ForegroundColor Yellow
        $deadline = (Get-Date).AddSeconds(30)
        $choice = $null
        while ((Get-Date) -lt $deadline) {
            if ([Console]::KeyAvailable) {
                $choice = [Console]::ReadKey($true).KeyChar
                break
            }
            Start-Sleep -Milliseconds 100
        }
        if ($choice -eq 'Y' -or $choice -eq 'y') {
            Write-Host ""
            Write-Host "🔄 Pulling origin/$branch..." -ForegroundColor Cyan
            git pull origin $branch --ff-only
            if ($LASTEXITCODE -ne 0) { throw "git pull failed" }
            Write-Host "📦 pnpm install..." -ForegroundColor Cyan
            pnpm install
            if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }
            Write-Host "🔨 Rebuilding..." -ForegroundColor Cyan
            pnpm -r --workspace-concurrency=1 build
            if ($LASTEXITCODE -ne 0) { throw "build failed" }
            Write-Host "✅ updated, continuing to start" -ForegroundColor Green
        } else {
            Write-Host "→ skipping update, starting current build" -ForegroundColor DarkGray
        }
    }

    $env:OD_RESOURCE_ROOT = ".raccoonui"
    $env:OD_PORT = $Port

    Write-Host "🦝 RaccoonUI starting on http://127.0.0.1:$Port/" -ForegroundColor Cyan

    # ── stale daemon hardening ──
    # A prior start.ps1 may have left a detached daemon on this port. Without
    # a kill the new spawn would EADDRINUSE. Match commandline before kill
    # so we never axe an unrelated service that happens to bind the port.
    $stale = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $stale) {
        $proc = Get-CimInstance Win32_Process `
            -Filter "ProcessId = $($c.OwningProcess)" -ErrorAction SilentlyContinue
        if ($proc -and $proc.CommandLine -match 'apps[\\/]daemon[\\/]dist[\\/]cli\.js') {
            Write-Host "⚠️  killing stale daemon PID $($c.OwningProcess) on :$Port" -ForegroundColor Yellow
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 500
        }
    }

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

#requires -Version 5.1
<#
.SYNOPSIS
  Launch RaccoonUI in dev mode (pnpm tools-dev) + open Electron desktop window.
.DESCRIPTION
  Spawns daemon + web from source so SKILL.md / design-systems / craft /
  prompt-templates edits in `creative/raccoonui/` are picked up immediately
  (no .raccoonui/ snapshot indirection, no prebuild dist), then attaches
  the Electron desktop shell on top.

  - Daemon API port: $env:OD_PORT or 17456
  - Web UI port:     $env:OD_WEB_PORT or 17573
  - Electron desktop window opens automatically once web is ready.
  - Closing the console OR the Electron window both shut down daemon +
    web + desktop together (Electron-watchdog polls main PID).

  Note: this is the in-repo author/operator entry point. The packaged
  release path (for installable .exe / .app distribution) lives in
  `tools/pack` and still uses prebuild dist + .raccoonui/ seed.
#>

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$RaccoonUIDir = (Resolve-Path "$PSScriptRoot\..\..").Path
$DaemonPort   = if ($env:OD_PORT)     { [int]$env:OD_PORT }     else { 17456 }
$WebPort      = if ($env:OD_WEB_PORT) { [int]$env:OD_WEB_PORT } else { 17573 }

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
    # ── pre-flight: dev-mode requires installed deps ──
    if (-not (Test-Path "node_modules")) {
        Write-Host "❌ node_modules 不在 — 先跑 install.ps1 或 pnpm install" -ForegroundColor Red
        exit 1
    }

    # ── pre-start update ──
    # Auto-update with no prompt so coworkers always boot the latest source.
    # Detect phase is best-effort (network down / detached HEAD / no upstream
    # silently skip with a visible note so the user knows they are running
    # un-checked source); the update phase fails loud so the user never
    # starts a half-rebuilt daemon.
    $detectOk = $true
    $detectSkipReason = $null
    $branch = $null
    $behind = 0
    try {
        $branch = (git rev-parse --abbrev-ref HEAD 2>$null | Out-String).Trim()
        if (-not $branch -or $branch -eq 'HEAD') {
            $detectOk = $false
            $detectSkipReason = 'detached HEAD'
        }
        if ($detectOk) {
            git fetch origin --quiet 2>$null
            if ($LASTEXITCODE -ne 0) {
                $detectOk = $false
                $detectSkipReason = 'git fetch failed (offline?)'
            }
        }
        if ($detectOk) {
            $countStr = (git rev-list --count "${branch}..origin/$branch" 2>$null | Out-String).Trim()
            if ([string]::IsNullOrEmpty($countStr)) {
                $detectOk = $false
                $detectSkipReason = "no origin/$branch tracking branch"
            } else { $behind = [int]$countStr }
        }
    } catch {
        $detectOk = $false
        if (-not $detectSkipReason) { $detectSkipReason = 'unexpected error' }
    }

    if (-not $detectOk) {
        Write-Host "ℹ️  跳過更新檢查 ($detectSkipReason) — 跑 local source" -ForegroundColor DarkGray
    } elseif ($behind -gt 0) {
        Write-Host ""
        Write-Host "⚠️  origin/$branch 領先本地 $behind commits — 自動更新中" -ForegroundColor Yellow
        Write-Host "🔄 Pulling origin/$branch..." -ForegroundColor Cyan
        git pull origin $branch --ff-only
        if ($LASTEXITCODE -ne 0) { throw "git pull failed" }
        Write-Host "📦 pnpm install..." -ForegroundColor Cyan
        pnpm install
        if ($LASTEXITCODE -ne 0) { throw "pnpm install failed" }
        Write-Host "✅ updated, continuing to start" -ForegroundColor Green
    }

    Write-Host "🦝 RaccoonUI starting (dev mode, source-of-truth)" -ForegroundColor Cyan
    Write-Host "   daemon API: http://127.0.0.1:$DaemonPort" -ForegroundColor DarkGray
    Write-Host "   web UI:     http://127.0.0.1:$WebPort" -ForegroundColor DarkGray

    # ── stale daemon hardening ──
    # A prior run may have left a detached daemon / web on these ports. Match
    # by commandline before kill so we never axe an unrelated service that
    # happens to bind the port.
    foreach ($p in @($DaemonPort, $WebPort)) {
        $stale = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
        foreach ($c in $stale) {
            $proc = Get-CimInstance Win32_Process `
                -Filter "ProcessId = $($c.OwningProcess)" -ErrorAction SilentlyContinue
            if ($proc -and $proc.CommandLine -match '(node|tools-dev|next|raccoonui|electron)') {
                Write-Host "⚠️  killing stale process PID $($c.OwningProcess) on :$p" -ForegroundColor Yellow
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
                Start-Sleep -Milliseconds 500
            }
        }
    }

    # ── spawn pnpm tools-dev run ──
    # `run` keeps the parent alive (vs `start` which daemonizes). When this
    # console closes, tools-dev shuts down daemon + web cleanly.
    # Use `pnpm.cmd` explicitly: PowerShell's Start-Process -FilePath does not
    # honor PATHEXT, so a bare `pnpm` resolves to the .ps1 entry and Windows
    # rejects it as "not a valid Win32 application". Same trap as the
    # npx-on-Windows issue (see raccoonui/git-project-bridge spawn fix).
    $devProc = Start-Process -FilePath "pnpm.cmd" `
        -ArgumentList "tools-dev","run", `
                      "--daemon-port",$DaemonPort, `
                      "--web-port",$WebPort `
        -PassThru -NoNewWindow

    # Wait for web to listen (web is what the user opens; daemon is upstream)
    $ready = $false
    for ($i = 0; $i -lt 90; $i++) {  # dev mode is slower than dist — give 90s
        try {
            $r = Invoke-WebRequest -Uri "http://127.0.0.1:$WebPort/" `
                -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { $ready = $true; break }
        } catch { }
        Start-Sleep -Seconds 1
    }

    if (-not $ready) {
        Write-Host "❌ web 啟動 timeout (90s) — 看 'pnpm tools-dev logs' 查錯" -ForegroundColor Red
        Stop-Process -Id $devProc.Id -Force -ErrorAction SilentlyContinue
        exit 1
    }

    # ── attach Electron desktop ──
    # `tools-dev start desktop` is a separate (background-stamped) spawn that
    # discovers the running web URL via sidecar IPC and pops a native window.
    # `run` itself only covers daemon+web (DEFAULT_RUN_APPS in tools/dev), so
    # desktop has to be kicked explicitly.
    Write-Host "✅ web ready — launching Electron desktop window..." -ForegroundColor Green
    pnpm tools-dev start desktop 2>&1 | Out-Host
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  desktop 啟動失敗 — 仍可在瀏覽器開 http://127.0.0.1:$WebPort/" -ForegroundColor Yellow
    }

    # ── Electron watchdog ──
    # `tools-dev run` only supervises daemon+web; closing the Electron window
    # leaves the supervisor + its pnpm/cmd wrapper chain as orphans (the same
    # zombie shape we kept cleaning up manually before this patch). Find the
    # Electron main PID (the one whose parent is NOT itself an electron.exe —
    # helper / renderer / utility processes are children of main) and poll.
    # When either Electron or devProc exits, fall through to the finally block
    # which kills the supervisor + runs `tools-dev stop`.
    $electronMain = $null
    for ($i = 0; $i -lt 30; $i++) {
        $candidates = Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -match [regex]::Escape($RaccoonUIDir) }
        if ($candidates) {
            $electronPidSet = @($candidates | ForEach-Object { $_.ProcessId })
            $electronMain = $candidates | Where-Object { $_.ParentProcessId -notin $electronPidSet } | Select-Object -First 1
            if ($electronMain) { break }
        }
        Start-Sleep -Milliseconds 500
    }

    if (-not $electronMain) {
        Write-Host "⚠️  could not locate Electron main PID — close console to stop" -ForegroundColor Yellow
        Wait-Process -Id $devProc.Id
    } else {
        Write-Host "🔗 watching Electron PID $($electronMain.ProcessId) — close window or console to stop" -ForegroundColor DarkGray
        while ($true) {
            if ($devProc.HasExited) { break }
            $electronAlive = Get-Process -Id $electronMain.ProcessId -ErrorAction SilentlyContinue
            if (-not $electronAlive) {
                Write-Host "🏁 Electron closed — shutting down daemon + web" -ForegroundColor Cyan
                break
            }
            Start-Sleep -Seconds 1
        }
    }
} finally {
    if ($devProc -and -not $devProc.HasExited) {
        Stop-Process -Id $devProc.Id -Force -ErrorAction SilentlyContinue
    }
    # Best-effort: tell tools-dev to clean up daemon + web + desktop it spawned
    try { pnpm tools-dev stop 2>$null | Out-Null } catch { }

    # -- background upstream sync --
    # The daemon is down and the operator has walked away: this is the only
    # window where merging upstream is both safe and unhurried. The daily cron
    # cannot use it -- it fires at 06:00, when this tool is usually open, and
    # its preflight then skips on the live :17456. Five straight days of that
    # is what let the fork drift 67 commits behind on 2026-08-30.
    #
    # Detached on purpose: a sync can run for minutes and must never hold the
    # console open. Verified to survive both a clean console exit and a forced
    # kill of the console. No gating is duplicated here -- upstream-sync.ts runs
    # its own preflight (branch / dirty tracked files / daemon port) and its own
    # five merge gates, writes audit-logs/, and pushes origin only when every
    # gate is green. The next start.ps1 run picks that up in its pre-start pull,
    # so the operator never has to think about any of it.
    try {
        $syncScript = Join-Path $RaccoonUIDir 'tools\raccoonui\upstream-sync.ts'
        $nodeBin = (Get-Command node -ErrorAction SilentlyContinue).Source
        if ((Test-Path $syncScript) -and $nodeBin) {
            $syncLogDir = Join-Path $RaccoonUIDir 'audit-logs'
            New-Item -ItemType Directory -Path $syncLogDir -Force | Out-Null
            # Single file, overwritten each shutdown: only the last run is worth
            # reading, and a dated file per shutdown would just accumulate.
            $syncOut = Join-Path $syncLogDir 'shutdown-sync.log'
            $syncErr = Join-Path $syncLogDir 'shutdown-sync.err.log'
            Start-Process -FilePath $nodeBin `
                -ArgumentList '--experimental-strip-types', $syncScript `
                -WorkingDirectory $RaccoonUIDir `
                -WindowStyle Hidden `
                -RedirectStandardOutput $syncOut `
                -RedirectStandardError $syncErr | Out-Null
            Write-Host "🔄 upstream 同步已在背景啟動 — 可以直接關視窗" -ForegroundColor DarkGray
            Write-Host "   結果：audit-logs\shutdown-sync.log" -ForegroundColor DarkGray
        }
    } catch {
        # Housekeeping must never block shutdown -- but it must not vanish
        # either. Say what broke, then let the shutdown finish.
        Write-Host "⚠️  背景同步啟動失敗（不影響關閉）：$_" -ForegroundColor Yellow
    }

    Pop-Location
}

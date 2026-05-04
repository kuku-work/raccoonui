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

    $env:OD_RESOURCE_ROOT = ".raccoonui"
    $env:OD_PORT = $Port

    Write-Host "🦝 RaccoonUI starting on http://127.0.0.1:$Port/" -ForegroundColor Cyan

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

#requires -Version 5.1
<#
.SYNOPSIS
  Create RaccoonUI desktop shortcut on Windows.
.DESCRIPTION
  Drops a "RaccoonUI.lnk" on the user's Desktop pointing to start.cmd.
  Idempotent — overwrites any existing shortcut. Custom icon picked up
  from .raccoonui/icon.ico if present (user can convert raccoonai logo
  with any SVG-to-ICO tool); otherwise uses the default shortcut icon.
.NOTES
  Invoked automatically by install.ps1; can also be run standalone.
#>

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

if ($PSVersionTable.PSVersion.Major -ge 6 -and -not $IsWindows) {
    Write-Host "❌ 這個 script 是 Windows 用的。macOS / Linux 請跑：" -ForegroundColor Red
    Write-Host "    ./scripts/raccoonui/make-shortcut.sh" -ForegroundColor Yellow
    exit 1
}

$RaccoonUIDir = (Resolve-Path "$PSScriptRoot\..\..").Path
$Desktop = [Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $Desktop 'RaccoonUI.lnk'
$TargetCmd = Join-Path $RaccoonUIDir 'scripts\raccoonui\start.cmd'

if (-not (Test-Path $TargetCmd)) {
    Write-Host "❌ start.cmd 不存在: $TargetCmd" -ForegroundColor Red
    Write-Host "   先跑 install.ps1 確保 scripts/raccoonui/ 完整" -ForegroundColor Yellow
    exit 1
}

# Custom icon — user-provided .raccoonui/icon.ico takes priority, falls back
# to no custom icon (default Windows shortcut chevron).
$CustomIcon = Join-Path $RaccoonUIDir '.raccoonui\icon.ico'

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = $TargetCmd
$shortcut.WorkingDirectory = $RaccoonUIDir
$shortcut.WindowStyle = 1   # 1 = normal, 7 = minimized
$shortcut.Description = "RaccoonUI — RaccoonAI internal design tool"
if (Test-Path $CustomIcon) {
    $shortcut.IconLocation = $CustomIcon
}
$shortcut.Save()

Write-Host "✅ Desktop shortcut: $ShortcutPath" -ForegroundColor Green
Write-Host "   雙擊「RaccoonUI」啟動 daemon + 開瀏覽器" -ForegroundColor Cyan
if (-not (Test-Path $CustomIcon)) {
    Write-Host ""
    Write-Host "   tip: 把 raccoonai logo 轉成 .ico 放在 .raccoonui\icon.ico 即可換捷徑 icon" -ForegroundColor DarkGray
    Write-Host "        (e.g. https://convertio.co/svg-ico/ 把 design-systems\raccoonai\assets\logo-mark-darkblue-bg.svg 轉成 256x256 .ico)" -ForegroundColor DarkGray
}

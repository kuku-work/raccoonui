#requires -Version 5.1
<#
.SYNOPSIS
  Create RaccoonUI desktop shortcut on Windows.
.DESCRIPTION
  Drops a "RaccoonUI.lnk" on the user's Desktop pointing to start.cmd.
  Idempotent — overwrites any existing shortcut. Icon resolution order:
    1. .raccoonui/icon.ico   (per-user override, gitignored)
    2. assets/raccoonui.ico  (repo default, generated from assets/logo.svg)
    3. fallback to default Windows shortcut chevron
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

# Icon resolution: per-user override → repo default → none
$UserIcon = Join-Path $RaccoonUIDir '.raccoonui\icon.ico'
$RepoIcon = Join-Path $RaccoonUIDir 'assets\raccoonui.ico'
$IconPath = if (Test-Path $UserIcon) { $UserIcon }
            elseif (Test-Path $RepoIcon) { $RepoIcon }
            else { $null }

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = $TargetCmd
$shortcut.WorkingDirectory = $RaccoonUIDir
$shortcut.WindowStyle = 1   # 1 = normal, 7 = minimized
$shortcut.Description = "RaccoonUI — RaccoonAI internal design tool"
if ($IconPath) {
    $shortcut.IconLocation = $IconPath
}
$shortcut.Save()

Write-Host "✅ Desktop shortcut: $ShortcutPath" -ForegroundColor Green
Write-Host "   雙擊「RaccoonUI」啟動 daemon + 開瀏覽器" -ForegroundColor Cyan
if ($IconPath) {
    Write-Host ("   icon: {0}" -f $IconPath) -ForegroundColor DarkGray
} else {
    Write-Host ""
    Write-Host "   tip: 自訂 icon 放 .raccoonui\icon.ico 即會 override repo default" -ForegroundColor DarkGray
}

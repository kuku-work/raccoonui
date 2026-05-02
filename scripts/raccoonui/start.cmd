@echo off
REM RaccoonUI launcher — Windows double-click entry point.
REM Wraps start.ps1; daemon runs until the console window is closed.

cd /d "%~dp0..\.."
pwsh -File "%~dp0start.ps1" %*
echo.
echo Daemon stopped. Press any key to close...
pause >nul

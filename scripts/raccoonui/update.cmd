@echo off
REM RaccoonUI updater — Windows double-click entry point.
REM Wraps update.ps1.

cd /d "%~dp0..\.."
pwsh -File "%~dp0update.ps1" %*
echo.
echo Press any key to close...
pause >nul

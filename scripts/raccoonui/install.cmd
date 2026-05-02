@echo off
REM RaccoonUI installer — Windows double-click entry point.
REM Wraps install.ps1 so non-engineering coworkers can just double-click.

cd /d "%~dp0..\.."
pwsh -File "%~dp0install.ps1" %*
echo.
echo Press any key to close...
pause >nul

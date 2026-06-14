@echo off
REM SyncForge — Windows CLI launcher
REM
REM This batch file allows running SyncForge from any directory
REM when added to PATH. It detects whether the project is built
REM and runs accordingly.

setlocal enabledelayedexpansion

REM Find the SyncForge installation directory (where this batch file lives)
set "SF_DIR=%~dp0"
set "SF_DIR=%SF_DIR:~0,-1%"

REM Check if dist exists (built version)
if exist "%SF_DIR%\..\dist\agent.js" (
    node "%SF_DIR%\..\dist\agent.js" %*
    exit /b !ERRORLEVEL!
)

REM Check if src exists (source version — run via tsx)
if exist "%SF_DIR%\..\src\agent.ts" (
    npx tsx "%SF_DIR%\..\src\agent.ts" %*
    exit /b !ERRORLEVEL!
)

REM Also check the npm global style layout
if exist "%SF_DIR%\..\..\dist\agent.js" (
    node "%SF_DIR%\..\..\dist\agent.js" %*
    exit /b !ERRORLEVEL!
)

echo Error: SyncForge installation not found. Make sure you're in the correct directory.
exit /b 1

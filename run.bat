@echo off
title QuickCO Courier Platform Server
echo ===================================================
echo     QuickCO - Smart Courier Management Platform
echo ===================================================
echo.
set PORT=3000
echo Starting local web server on port %PORT%...
echo.

:: Open browser automatically after 1 second
start "" http://localhost:%PORT%

:: Start python web server
python -m http.server %PORT%

if %errorlevel% neq 0 (
    echo Python not found or failed, trying node/npx...
    npx -y serve -p %PORT%
)

pause

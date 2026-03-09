@echo off
echo ==========================================
echo Starting Leads Dashboard CRM...
echo ==========================================

:: Kill any existing node processes on port 3000
echo Cleaning up environment...
taskkill /F /IM node.exe /T >nul 2>&1

:: Start Next.js server in a new window
echo Launching Server...
start "Dashboard Server" cmd /k "npx next dev --port 3000"

:: Wait for server to initialize
echo Waiting 15 seconds for server to warm up...
timeout /t 15 /nobreak >nul

:: Start ngrok with static domain
echo Launching Public URL Tunnel (Ngrok Static Domain)...
start "Public Tunnel" cmd /k "ngrok http --url=cherri-exsectile-minutely.ngrok-free.dev 3000"

echo.
echo ==========================================
echo DONE! 
echo 1. Your permanent URL is: https://cherri-exsectile-minutely.ngrok-free.dev
echo 2. Use that URL + /api/webhook for Twilio.
echo ==========================================
pause

@echo off
cd /d "%~dp0"
echo Checking for Node.js...
node -v
echo.
echo Trying to install...
call npm install
echo.
echo Trying to run...
call npm run dev
echo.
echo If you see this, something stopped the process.
pause
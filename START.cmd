@echo off
setlocal
 title Battle Video Generator
pushd "%~dp0"
if errorlevel 1 goto folder_error

where node.exe >nul 2>&1
if errorlevel 1 goto node_error
where npm.cmd >nul 2>&1
if errorlevel 1 goto node_error

if exist "node_modules\vite\bin\vite.js" goto launch
echo Installing project dependencies. Please wait...
call npm.cmd ci --no-audit --no-fund
if errorlevel 1 goto install_error

:launch
echo Starting Battle Video Generator...
echo The app will open in your browser automatically.
echo Keep this window open while using the app.
echo Close this window to stop the app.
echo.
call npm.cmd run dev -- --host 127.0.0.1 --open
if errorlevel 1 goto launch_error
popd
exit /b 0

:node_error
echo ERROR: Node.js and npm were not found. Install Node.js, then try again.
goto failed

:install_error
echo ERROR: Could not install dependencies. Check your internet connection.
goto failed

:launch_error
echo ERROR: Could not start the app. See the details above.
goto failed

:folder_error
echo ERROR: Could not open the project folder.
pause
exit /b 1

:failed
pause
popd
exit /b 1
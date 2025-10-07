@echo off
setlocal
set PORT=5173
where node >nul 2>nul || (echo Node.js not found. Install from https://nodejs.org && exit /b 1)
node server.mjs %PORT%

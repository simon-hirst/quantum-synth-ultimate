@echo off
setlocal
set PORT=5173
where cloudflared >nul 2>nul || (echo cloudflared not found. Install with: winget install --id Cloudflare.cloudflared -e && exit /b 1)
cloudflared tunnel --url http://localhost:%PORT%

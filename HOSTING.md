# Host from your machine

## Option A: One-liner with Node + Cloudflare Quick Tunnel
1. Open Terminal or PowerShell in this folder.
2. Start the server:
   ```
   npm start
   ```
   This serves the folder on http://localhost:5173
3. Install cloudflared if missing:
   - Windows:
     ```
     winget install --id Cloudflare.cloudflared -e
     ```
   - macOS:
     ```
     brew install cloudflare/cloudflare/cloudflared
     ```
   - Linux (Debian/Ubuntu):
     ```
     sudo apt-get install cloudflared || curl -s https://pkg.cloudflare.com/install.sh | sudo bash
     ```
4. Create a public URL:
   ```
   cloudflared tunnel --url http://localhost:5173
   ```
   Copy the https://*.trycloudflare.com URL and share it.

## Option B: Python instead of Node
```
python -m http.server 5173
```
Then run the same `cloudflared tunnel` command.

Notes
- Quick Tunnels are ephemeral. For a stable custom subdomain, create a Cloudflare account and set up a named Tunnel mapped to a route on your domain.
- If your browser blocks system audio capture, use Chrome or Edge and select a tab/window with "Share system audio".

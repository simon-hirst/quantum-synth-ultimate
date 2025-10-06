# Auralux

A single-purpose, zero-backend audio visualiser that runs locally. It captures system audio or mic and renders a shader that reacts to bass, mids, and highs. No comments in code, names are clear and short.

## Quick start
1) Install Node 18+
2) From `frontend/`:
```bash
npm i
npm run dev    # http://localhost:53229
# or
npm run build
npm run preview  # http://localhost:53229
Use
Click System and choose Entire screen with Share audio enabled, or use Mic, or Demo.

Sensitivity adjusts visual gain.

Theme changes the tint palette.

Fullscreen toggles with the button or F11.

Tech
Vite + TypeScript

Three.js + WebAudio

Notes
Screen audio requires localhost or HTTPS.

No server or WebSocket is used.
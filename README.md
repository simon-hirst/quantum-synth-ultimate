# QuantumSynth Ultimate — Neural Edition

Beautiful, **music-reactive** WebGL visuals that run in your browser. Point it at any audio (use screen-share with "Share audio"), and QuantumSynth paints the sound with elegant, performance-friendly shaders.

**Live demo:**
👉 https://quantum-ai-backend.wittydune-e7dd7422.eastus.azurecontainerapps.io

---

## Highlights

- **Tasteful, reactive presets** — five hand-picked scenes that feel alive:
  - `auroraFlow` — silky aurora curtains driven by bass & highs
  - `liquidSpectrum` — domain-warped fluid with musical contour lines
  - `neonParticles` — drifting neon bokeh that swells on the beat
  - `ribbonWaves` — glossy ribbon fields locked to the waveform
  - `glassCells` — animated cells with spec-contour glow
- **Audio-aware**: bass/mid/air bands, beat/impact detection, light AGC
- **Zero config** front-end: open the page, hit **Start Screen Sharing**, and vibe
- **Server shader** support: hot-load a server-provided shader for experiments
- **Responsive & crisp**: DPR-aware sizing with aspect-correct geometry

---

## Quick start (local dev)

> Requirements: Node 18+ and a modern browser (Chrome/Edge recommended)

```bash
# from repo root
cd frontend
npm install
npm run dev
# ...open the printed local URL (usually http://localhost:5173)
```

Now:

1. Click **Start Screen Sharing**
2. Select **Entire Screen** and **tick "Share audio"** (tabs with DRM often block audio)
3. Press **M** to cycle visuals or use **1–5** to pick a scene

---

## Controls

- **M** — next scene
- **1–5** — directly select a scene
- **P** — pause/resume auto-rotation
- **S** — show the server shader once (not in rotation)
- Side buttons: Start Screen Sharing, Stop, Demo Mode, Pause rotation

---

## Project structure (front-end)

```
frontend/
  src/
    main.ts              # UI shell + bootstraps the Visualizer
    visualizer.ts        # WebGL scenes, audio analysis, render loop
    backend-config.ts    # backend host & helpers (httpBase, wsUrl)
    style.css            # layout/theme
```

The visualizer is self-contained and renders a single full-viewport canvas.
All scenes are fragment shaders compiled at runtime and fed with audio textures.

---

## Backend & configuration

By default, the front-end connects to the same host it was served from.
You can point it at a different backend host with an env var:

```bash
# Vite example (run from frontend/)
echo "VITE_BACKEND_HOST=localhost:8080" >> .env.local
npm run dev
```

Or edit `frontend/src/backend-config.ts`:

```ts
export const BACKEND_CONFIG = {
  url: "quantum-ai-backend-https.wittydune-e7dd7422.eastus.azurecontainerapps.io",
  useSecure: true
};
```

Helpers used by the visualizer:

- `httpBase()` → builds `http(s)://host`
- `wsUrl(path)` → builds `ws(s)://host/path`

> The server may provide an experimental shader at `/api/shader/next`.
> Press **S** in the UI to preview it (not added to scene rotation).

---

## Production build

```bash
cd frontend
npm run build
# outputs to frontend/dist — deploy as static assets behind any CDN/web server
```

If front-end and back-end are on different origins, ensure **CORS** and **WS** are allowed from your front-end host.

---

## Troubleshooting

- **No audio / very flat**
  Use **Entire Screen** + **Share audio**. Some tabs/apps block capture (DRM).
  System volume and per-app mixers matter on Windows.

- **"WebGL not supported"**
  Update your browser/GPU drivers; ensure WebGL2 is enabled. Try Chrome/Edge.

- **White/black screen**
  Open DevTools → Console. Shader compile/link errors will show there.

- **Server shader shows nothing**
  The server endpoint may not be returning a valid fragment shader. Press **1–5** to return to built-in scenes.

---

## Contributing

PRs welcome! Focus areas that help the most:
- New elegant shaders that are genuinely music-reactive
- Performance wins on lower-end GPUs
- Accessibility & UX polish

Please keep presets tasteful—avoid eye-searing strobes or dated "ring/glow" looks.

---

## License

See **LICENSE** in the repository.

---

## Credits

Built by [@simon-hirst](https://github.com/simon-hirst).
Shader & system polish with love from the community.

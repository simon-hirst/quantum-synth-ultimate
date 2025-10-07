# Mesmerize Visualizer

Unzip and open `index.html` in a modern Chromium browser. Click **Share Audio** and choose a tab or window with audio, ensure **Share system audio** is enabled.

## Visualisers
1. Spectrum Rings
2. Particle Nebula
3. Liquid Grid
4. Waveform Tunnel
5. Kaleido Bloom
6. Neon Lissajous

Use `[` and `]` to cycle, `1-6` to jump, `F` fullscreen, `P` Picture‑in‑Picture overlay, `C` auto‑calibrate, `H` hide/show UI.

## Notes
- System audio capture works best on Chrome/Edge with **Share tab audio**. Safari and some mobiles may not support it.
- Seamless transitions use audio‑reactive displacement rather than a simple fade.
- A minimal plugin API exists: create a new file in `src/visuals` exporting a class extending `ShaderVis` with a fragment shader string. Register it in `src/core/visualizerManager.js` list.
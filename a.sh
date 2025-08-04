#!/usr/bin/env bash
# scripts/patch_frontend_006_sidebar_fullscreen_readme_gitignore_node_fix.sh
# Fix: previous Node heredoc passed the file arg *after* the terminator, breaking on Windows Git Bash.
# This version uses Node only (no Python) and passes args correctly.
#
# 1) Add a.sh to .gitignore (idempotent)
# 2) Insert a cold-start note under the "Live demo:" line in README.md (idempotent)
# 3) Inject a sidebar minimize toggle + a bottom-right fullscreen button in frontend/src/main.ts
# 4) Append CSS for those controls to frontend/src/style.css (idempotent)
# 5) Commit via scripts/qs_commit.sh (your randomized dating rule)
#
# Run from repo root:
#   bash scripts/patch_frontend_006_sidebar_fullscreen_readme_gitignore_node_fix.sh

set -euo pipefail

[[ -x scripts/qs_commit.sh ]] || { echo "❌ scripts/qs_commit.sh missing or not executable"; exit 1; }
[[ -d frontend/src ]] || { echo "❌ frontend/src not found (run from repo root)"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required. Please install Node and retry."; exit 1; }

# -------------------------------------------------------------------
# 1) .gitignore: add a.sh
# -------------------------------------------------------------------
touch .gitignore
if ! grep -qxF 'a.sh' .gitignore; then
  echo 'a.sh' >> .gitignore
fi

# -------------------------------------------------------------------
# 2) README: inject a cold-start note after "Live demo:" line
# -------------------------------------------------------------------
if [[ -f README.md ]]; then
node - <<'NODE'
const fs = require('fs');
const path = 'README.md';
if (!fs.existsSync(path)) process.exit(0);

let txt = fs.readFileSync(path, 'utf8');
if (!/cold[- ]start/i.test(txt)) {
  txt = txt.replace(
    /^Live demo:.*$/m,
    (m) => m + "\n\n> **Note:** the demo runs on a serverless container; if it hasn’t been used in a while it may need **~10–30s** to cold-start."
  );
  fs.writeFileSync(path, txt, 'utf8');
}
NODE
fi

# -------------------------------------------------------------------
# 3) Inject UI controls & handlers into main.ts (NO Python)
# -------------------------------------------------------------------
MT="frontend/src/main.ts"
[[ -f "$MT" ]] || { echo "❌ $MT not found"; exit 1; }

# Backup once
[[ -f "${MT}.bak.qs006" ]] || cp "$MT" "${MT}.bak.qs006"

# NOTE: Pass "$MT" BEFORE the heredoc terminator. Do NOT append after 'NODE'.
node - "$MT" <<'NODE'
const fs = require('fs');

const file = process.argv[2] || 'frontend/src/main.ts';
let s = fs.readFileSync(file, 'utf8');

const hasButtons = s.includes('btnToggleSide') && s.includes('btnFullscreen');

/** A) Inject the two buttons right before the canvas creation */
if (!hasButtons) {
  const inject = `
  // === injected: sidebar toggle + fullscreen button ===
  const btnToggleSide = h('button', 'qs-side-toggle', '◄');
  btnToggleSide.id = 'btnToggleSide';
  btnToggleSide.title = 'Toggle sidebar';
  side.prepend(btnToggleSide);

  const btnFullscreen = h('button', 'qs-fullscreen', '⛶');
  btnFullscreen.id = 'btnFullscreen';
  btnFullscreen.title = 'Fullscreen';
  main.appendChild(btnFullscreen);
  // === end injected ===
`;

  const reCanvas = /\n\s*const\s+canvas\s*=\s*h\(\s*['"]canvas['"]\s*,\s*['"]qs-canvas['"]\s*\)\s*as\s*HTMLCanvasElement;/;
  if (reCanvas.test(s)) {
    s = s.replace(reCanvas, inject + s.match(reCanvas)[0]);
  } else {
    // Fallback: prepend to file if anchor not found
    s = inject + s;
  }
}

/** B) Wire up handlers after the btnPause.onclick block */
if (!s.includes('btnFullscreen.onclick')) {
  const handlers = `
  // injected handlers
  const shellEl = shell;
  btnToggleSide.onclick = () => {
    shellEl.classList.toggle('side-collapsed');
    btnToggleSide.textContent = shellEl.classList.contains('side-collapsed') ? '►' : '◄';
    window.dispatchEvent(new Event('resize'));
  };

  const requestFs = async (el) => {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el.msRequestFullscreen) return el.msRequestFullscreen();
  };
  const exitFs = async () => {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
  };

  btnFullscreen.onclick = async () => {
    const target = document.querySelector('.qs-main') || document.documentElement;
    if (!document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.msFullscreenElement) {
      await requestFs(target);
    } else {
      await exitFs();
    }
  };
`;

  const rePause = /btnPause\.onclick\s*=\s*\(\)\s*=>\s*\{[\s\S]*?\};/;
  if (rePause.test(s)) {
    s = s.replace(rePause, (m) => m + handlers);
  } else {
    // Fallback: append near end of DOMContentLoaded block
    const reDom = /document\.addEventListener\(\s*['"]DOMContentLoaded['"]\s*,\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*\);/;
    if (reDom.test(s)) s = s.replace(reDom, (m) => m.replace(/\}\s*\);\s*$/, handlers + '});'));
    else s += handlers;
  }
}

fs.writeFileSync(file, s, 'utf8');
console.log('✔ main.ts patched (sidebar toggle + fullscreen).');
NODE

# -------------------------------------------------------------------
# 4) CSS for collapsed sidebar + fullscreen button
# -------------------------------------------------------------------
CSS="frontend/src/style.css"
touch "$CSS"
if ! grep -q "/* QS006 sidebar/fullscreen */" "$CSS"; then
cat >> "$CSS" <<'CSSADD'

/* QS006 sidebar/fullscreen */
.qs-shell { position: relative; }
.qs-side { transition: transform .25s ease, width .25s ease, padding .25s ease; will-change: transform; }
.qs-shell.side-collapsed .qs-side { transform: translateX(-100%); width: 0 !important; padding-left: 0 !important; padding-right: 0 !important; border: 0 !important; }
.qs-shell.side-collapsed .qs-main { margin-left: 0 !important; }

.qs-side-toggle{
  position: absolute;
  top: 10px;
  right: -12px;
  z-index: 20;
  width: 24px;
  height: 24px;
  line-height: 24px;
  border-radius: 999px;
  border: 0;
  cursor: pointer;
  font-weight: 700;
  background: rgba(255,255,255,0.1);
  color: #cfe9ff;
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.25);
}

.qs-fullscreen{
  position: absolute;
  right: 16px;
  bottom: 16px;
  z-index: 30;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 18px;
  background: rgba(255,255,255,0.12);
  color: #dff3ff;
  backdrop-filter: blur(6px);
  box-shadow: 0 6px 18px rgba(0,0,0,0.35);
}
.qs-fullscreen:hover{ background: rgba(255,255,255,0.18); }
CSSADD
fi

# -------------------------------------------------------------------
# 5) Commit
# -------------------------------------------------------------------
git add .gitignore README.md "$MT" "$CSS"
scripts/qs_commit.sh "fix(ui): node-only patch for sidebar minimize + fullscreen; README cold-start note; ignore a.sh" --all

echo "✅ Done:
 - a.sh ignored
 - README demo cold-start note inserted
 - Sidebar toggle + fullscreen button added and styled (Node-only script)
 - Changes committed with your dated commit rule"

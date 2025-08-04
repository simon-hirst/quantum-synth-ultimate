#!/usr/bin/env bash
# scripts/patch_repo_ignores_and_plasma_orb_node.sh
#
# Part A) Tighten .gitignore for this repo (frontend + Go + OS cruft).
# Part B) Re-implement the Plasma Orb reactivity patch **without Python** (Node only).
# Part C) Commit via scripts/qs_commit.sh using your randomized dating rule.
#
# Run from repo root:
#   bash scripts/patch_repo_ignores_and_plasma_orb_node.sh
#
# Safe to re-run; all edits are idempotent.

set -euo pipefail

[[ -x scripts/qs_commit.sh ]] || { echo "❌ scripts/qs_commit.sh missing or not executable"; exit 1; }
[[ -f frontend/src/visualizer.ts ]] || { echo "❌ frontend/src/visualizer.ts not found"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required (no Python needed)."; exit 1; }

# ------------------------------------------------------------
# Part A) .gitignore tightening (idempotent append)
# ------------------------------------------------------------
touch .gitignore

append_ignore () {
  local pat="$1"
  # add as a single exact line if not already present
  if ! grep -qxF "$pat" .gitignore; then
    echo "$pat" >> .gitignore
  fi
}

# already requested earlier
append_ignore "a.sh"

# Node / Vite / TS caches & builds
append_ignore "node_modules/"
append_ignore "frontend/node_modules/"
append_ignore "dist/"
append_ignore "frontend/dist/"
append_ignore ".vite/"
append_ignore "frontend/.vite/"
append_ignore ".parcel-cache/"
append_ignore ".cache/"
append_ignore "*.tsbuildinfo"

# Logs
append_ignore "npm-debug.log*"
append_ignore "yarn-error.log*"
append_ignore "pnpm-debug.log*"
append_ignore "logs/"
append_ignore "*.log"

# Env / local config (keep examples if any)
append_ignore ".env"
append_ignore ".env.*"
append_ignore ".env.local"
append_ignore ".env.*.local"

# OS/editor cruft
append_ignore ".DS_Store"
append_ignore "Thumbs.db"
append_ignore ".idea/"
append_ignore ".vscode/"
append_ignore "*.swp"
append_ignore "*.tmp"
append_ignore "*.bak"
append_ignore "*.orig"
append_ignore "*.rej"

# Go build artifacts
append_ignore "bin/"
append_ignore "*.exe"
append_ignore "*.dll"
append_ignore "*.so"
append_ignore "*.dylib"

# Test/coverage (if added later)
append_ignore "coverage/"

# ------------------------------------------------------------
# Part B) Plasma Orb reactivity patch (Node only)
# - Replaces const FS_PLASMA_ORB = `...`;
# - If that block is absent, exits gracefully without failing.
# ------------------------------------------------------------
[[ -f frontend/src/visualizer.ts.bak.qs007 ]] || cp frontend/src/visualizer.ts frontend/src/visualizer.ts.bak.qs007

node - <<'NODE'
const fs = require('fs');

const file = 'frontend/src/visualizer.ts';
let s = fs.readFileSync(file, 'utf8');

const re = /const\s+FS_PLASMA_ORB\s*=\s*`[\s\S]*?`;\s*/m;

if (!re.test(s)) {
  console.log('⚠️  FS_PLASMA_ORB block not found — skipping shader replacement (no error).');
} else {
  const newShader =
'const FS_PLASMA_ORB = `\n' +
'${PRELUDE}${NOISE}${AUDIO_UNI}\n' +
'float ring(float d, float w){ return smoothstep(w, 0.0, abs(d)); }\n' +
'float sat01(float x){ return clamp(x,0.0,1.0); }\n' +
'void main(){\n' +
'  vec2 uv=vUV; vec2 p=toAspect(uv);\n' +
'  float t=uTime;\n' +
'\n' +
'  // Polar & audio probes\n' +
'  float r=length(p)+1e-5;\n' +
'  float ang=atan(p.y,p.x);\n' +
'  float specA = specAt(fract((ang+3.14159)/6.28318));\n' +
'  float specR = specAt(sat(r));\n' +
'  float wavX  = waveAt(fract(0.5*(p.x+1.0)));\n' +
'  float wavY  = waveAt(fract(0.5*(p.y+1.0)));\n' +
'\n' +
'  // Orb radius: breathe harder with bass/impact\n' +
'  float breathe = 0.36 + 0.75*uLow + 0.35*uImpact;\n' +
'  float baseR = 0.43 + 0.08*sin(t*2.0 + uLow*4.0) - 0.07*breathe;\n' +
'\n' +
'  // Domain warp driven by mids/highs + a bit of beat\n' +
'  vec2 w = p;\n' +
'  float warp = 0.22 + 0.35*uMid + 0.25*uAir + 0.20*uBeat;\n' +
'  w += warp * vec2(fbm(p*3.8 + vec2(0.0,t*0.9)), fbm(p*3.5 + vec2(t*1.1,0.0)));\n' +
'  w += 0.05*vec2(sin(ang*12.0 + t*5.0)*specA, cos(ang*10.0 - t*4.0)*specR);\n' +
'\n' +
'  // Edge vibration (spectrum+waveform) and width scales\n' +
'  float edgeNoise = 0.08*fbm(w*4.0 + vec2(t*0.8,-t*0.7)) + 0.05*(wavX+wavY);\n' +
'  float edgeWidth = 0.05 + 0.04*uImpact + 0.02*uBeat;\n' +
'  float edge = ring(r - (baseR + edgeNoise), edgeWidth) * (0.8 + 2.2*uLevel + 1.2*uImpact);\n' +
'\n' +
'  // Inner core with swirl\n' +
'  float layer = pow(sat01(baseR - r + 0.12), 2.0);\n' +
'  float swirl = fbm(rot(w, t*0.35 + uLow*1.2)*2.6);\n' +
'  float core = layer * (0.35 + 2.4*uLevel + 1.2*uLow) * (0.6 + 0.8*swirl);\n' +
'\n' +
'  // Beat ripples (travel outward faster on strong bass)\n' +
'  float speed = 3.4 + 8.0*uLow + 3.0*uAir;\n' +
'  float ripple = 0.0;\n' +
'  for(int i=0;i<4;i++){\n' +
'    float ph = t*speed - float(i)*0.65;\n' +
'    ripple += ring( sin(13.0*r - ph*8.0), 0.11 - 0.03*uImpact );\n' +
'  }\n' +
'  ripple *= (0.18 + 2.2*uBeat + 1.1*uImpact);\n' +
'\n' +
'  // Color & glow\n' +
'  vec3 ink = mix(vec3(0.12,1.0,1.1), vec3(1.0,0.55,1.05), sat(0.55 + 0.45*swirl + 0.35*specA));\n' +
'  vec3 col = vec3(0.02);\n' +
'  col += ink * (edge*1.15 + ripple*0.85);\n' +
'  col += vec3(0.2,0.4,0.7) * core;\n' +
'\n' +
'  float halo = exp(-pow(r*2.1, 2.0)) * (0.35 + 2.0*uLow + 0.9*uImpact + 0.5*uBeat);\n' +
'  col += vec3(0.2,0.95,1.1) * halo;\n' +
'\n' +
'  col *= vignette(uv);\n' +
'  gl_FragColor = vec4(col,1.0);\n' +
'}\n' +
'`;\n';

  s = s.replace(re, newShader);
  fs.writeFileSync(file, s, 'utf8');
  console.log('✔ FS_PLASMA_ORB replaced with hotter, more reactive version.');
}
NODE

# ------------------------------------------------------------
# Part C) Commit
# ------------------------------------------------------------
git add .gitignore frontend/src/visualizer.ts
scripts/qs_commit.sh "chore(gitignore)+feat(plasmaOrb): tighten ignore list; plasma orb reactivity via Node script (no Python)" --all

echo "✅ Done:
 - .gitignore tightened (frontend caches, logs, env, OS/editor junk, Go build artifacts)
 - Plasma Orb shader patched via Node (if present)
 - Changes committed with your randomized dating rule"

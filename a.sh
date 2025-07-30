#!/usr/bin/env bash
# Patch 002b — nuke the broken sed and fix the UI hint safely (no sed).
# Save this file as **a.sh** in the repo root (overwrite the old one) and run:
#   bash a.sh
#
# What this does:
# 1) Updates frontend/src/main.ts using Node (portable) to show "(or 1–5)"
#    and the new "Ready..." hint text.
# 2) Finds any patch scripts that still contain the broken `sed -i ... ;s` line
#    and comments those lines out so they won’t error again.
# 3) Commits via scripts/qs_commit.sh so your dating rule is honored.

set -euo pipefail

# --- Guards -------------------------------------------------------------------
[[ -x scripts/qs_commit.sh ]] || { echo "❌ scripts/qs_commit.sh missing or not executable"; exit 1; }
[[ -f frontend/src/main.ts ]] || { echo "❌ frontend/src/main.ts not found"; exit 1; }

# --- 1) Safe text updates via Node -------------------------------------------
node <<'NODE'
const fs = require('fs');
const p = 'frontend/src/main.ts';
let s = fs.readFileSync(p, 'utf8');

// Replace "(or 1–0)" or "(or 1-0)" with "(or 1–5)"
s = s.replace(/\(or 1[–-]0\)/g, '(or 1–5)');

// Normalize any "Ready." status line to the new hint
s = s.replace(/Ready\.[^\n]*/g, 'Ready. M next • 1–5 choose • P pause • S server (not in rotation)');

fs.writeFileSync(p, s);
console.log('✔ main.ts UI hint updated');
NODE

# --- 2) Comment out any lingering broken sed lines in patch scripts ----------
# [autofixed] # We target only lines that try to edit main.ts and contain "sed -i" and "Ready."   # removed by Patch 002b
mapfile -t PATCHES < <(git ls-files '*.sh' 2>/dev/null || true)
for f in "${PATCHES[@]}"; do
  if grep -qE 'sed -i.*Ready\.' "$f"; then
    echo "⚙️  Patching broken sed in $f"
    awk '
      /sed -i.*Ready\./ {
        print "# [autofixed] " $0 "   # removed by Patch 002b";
        next
      }
      { print }
    ' "$f" > "$f.tmp.qs002b" && mv "$f.tmp.qs002b" "$f"
    chmod +x "$f" || true
  fi
done

# --- 3) Stage & commit --------------------------------------------------------
git add frontend/src/main.ts
git add $(printf "%s\n" "${PATCHES[@]}" | tr '\n' ' ') 2>/dev/null || true
scripts/qs_commit.sh "fix(scripts): remove broken sed from old patch; update UI hint via Node (1–5 + new Ready text)" || true

echo "✅ Done. Re-run your dev server and the hint should read '(or 1–5)'."
echo "   Any old patch scripts with the broken sed have been neutralized."

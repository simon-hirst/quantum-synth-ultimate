#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./git_smart_commit.sh "feat: message" [files...]
#   ./git_smart_commit.sh --amend-last
#
# Behavior:
# - 75% chance: same calendar day as the latest commit, but strictly later than its time
# - 25% chance: +1..7 days later
# - Minutes/seconds randomized
# - Preserves last commit's timezone offset
#
# Notes:
# - Uses RFC 2822 date format for maximum Git compatibility on Windows Git Bash.
# - Applies date to BOTH author & committer.
# - Inline env assignment ensures the git process gets the dates on MINGW64.

if ! command -v git >/dev/null 2>&1; then
  echo "❌ git not found"; exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is required"; exit 1
fi

if [ $# -lt 1 ]; then
  echo "❌ Supply a commit message and optional files, or --amend-last"
  echo "   Example: ./git_smart_commit.sh \"fix: canvas DPR\" frontend/src/main.ts"
  echo "            ./git_smart_commit.sh --amend-last"
  exit 1
fi

AMEND=0
if [ "$1" = "--amend-last" ]; then
  AMEND=1
  shift || true
fi

# Prepare staging if not amending
if [ $AMEND -eq 0 ]; then
  MSG="$1"; shift || true
  if [ $# -gt 0 ]; then git add "$@"; fi
  if git diff --cached --quiet; then
    echo "❌ No staged changes to commit."; exit 1
  fi
fi

SMART_DATE="$(node - <<'NODE'
const { execSync } = require('child_process');

function getLastIso() {
  try {
    const iso = execSync('git log -1 --format=%cI', {stdio:['ignore','pipe','ignore']})
      .toString().trim();
    if (iso) return iso;
  } catch {}
  // If no commits yet, seed from now (UTC)
  return new Date().toISOString();
}

function parseOffset(iso) {
  // match +HH:MM or +HHMM or Z
  if (/Z$/.test(iso)) return { minutes: 0, str: '+0000' };
  const m = iso.match(/([+-])(\d{2}):?(\d{2})$/);
  if (!m) return { minutes: 0, str: '+0000' };
  const sign = m[1] === '-' ? -1 : 1;
  const hh = parseInt(m[2],10), mm = parseInt(m[3],10);
  return { minutes: sign * (hh*60 + mm), str: `${m[1]}${m[2]}${m[3]}` };
}

function pad(n){ return String(n).padStart(2,'0'); }

const lastIso = getLastIso();
const off = parseOffset(lastIso);

const lastUtcMs = Date.parse(lastIso);
const lastLocalMs = lastUtcMs + off.minutes*60*1000;
const lastLocal = new Date(lastLocalMs);

const sameDay = Math.random() < 0.5;

// Start/end of day (same tz as last commit)
const sod = new Date(lastLocal); sod.setHours(0,0,0,0);
const eod = new Date(lastLocal); eod.setHours(23,59,59,0);

let targetLocal;
if (sameDay) {
  // At least +60s after last commit, but before end of day
  const minMs = Math.min(eod.getTime(), lastLocal.getTime() + 60*1000);
  if (minMs >= eod.getTime()) {
    // Edge: last commit late at night -> roll forward 1..7 days
    const d = 1 + Math.floor(Math.random()*7);
    targetLocal = new Date(sod.getTime() + d*24*3600*1000);
    targetLocal.setHours(9 + Math.floor(Math.random()*12));  // 09..20
    targetLocal.setMinutes(Math.floor(Math.random()*60));
    targetLocal.setSeconds(Math.floor(Math.random()*60), 0);
  } else {
    // Random within [minMs, eod]
    const add = Math.floor(Math.random() * (eod.getTime() - minMs + 1));
    targetLocal = new Date(minMs + add);
  }
} else {
  const d = 1 + Math.floor(Math.random()*7); // 1..7 days later
  targetLocal = new Date(sod.getTime() + d*24*3600*1000);
  targetLocal.setHours(9 + Math.floor(Math.random()*12));  // 09..20
  targetLocal.setMinutes(Math.floor(Math.random()*60));
  targetLocal.setSeconds(Math.floor(Math.random()*60), 0);
}

// Convert local (last-commit tz) to UTC ms for correctness (not needed for format, but sanity)
const targetUtcMs = targetLocal.getTime() - off.minutes*60*1000;

// RFC 2822 format with preserved offset: "Mon, 02 Jan 2006 15:04:05 -0700"
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dow = DAYS[targetLocal.getDay()];
const dom = pad(targetLocal.getDate());
const mon = MONTHS[targetLocal.getMonth()];
const year = targetLocal.getFullYear();
const HH = pad(targetLocal.getHours());
const mm = pad(targetLocal.getMinutes());
const ss = pad(targetLocal.getSeconds());
const rfc2822 = `${dow}, ${dom} ${mon} ${year} ${HH}:${mm}:${ss} ${off.str}`;

process.stdout.write(rfc2822);
NODE
)"

echo "🕒 Chosen commit date: $SMART_DATE"

# Inline env ensures dates are seen by git even under MSYS/MINGW
if [ $AMEND -eq 1 ]; then
  GIT_AUTHOR_DATE="$SMART_DATE" GIT_COMMITTER_DATE="$SMART_DATE" \
    git commit --amend --no-edit --date="$SMART_DATE"
else
  MSG="${MSG:-}"
  GIT_AUTHOR_DATE="$SMART_DATE" GIT_COMMITTER_DATE="$SMART_DATE" \
    git commit -m "$MSG" --date="$SMART_DATE"
fi

# Show what we actually got
echo "🔎 Latest commit dates:"
git log -1 --format="  %h  %ad  |  %cd" --date=iso-strict-local

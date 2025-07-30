#!/usr/bin/env bash
# qs_commit.sh — fair 50/50 commit dating (UTC)
#
# Usage:
#   scripts/qs_commit.sh "your message" [extra git commit args...]
#
# Policy:
#  - Look at the previous commit date (UTC).
#  - 50% chance: same calendar day, with a strictly later time on that day.
#  - 50% chance: add 1–7 days, random time of day.
#  - Always advance time vs. previous commit; never go backwards.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: scripts/qs_commit.sh \"message\" [extra git commit args...]"
  exit 1
fi

msg=$1; shift || true

# ---------- RNG helpers (robust across shells/OS) ----------
rand_u16() {
  # Returns a 0..65535 integer using /dev/urandom or fallbacks.
  if [[ -r /dev/urandom ]] && command -v od >/dev/null 2>&1; then
    od -An -N2 -tu2 /dev/urandom | tr -d ' ' || true
  elif command -v hexdump >/dev/null 2>&1 && [[ -r /dev/urandom ]]; then
    hexdump -n 2 -e '1/2 "%u"' /dev/urandom || true
  elif command -v python3 >/dev/null 2>&1; then
    python3 - <<'PY' || true
import random
print(random.randrange(0,65536))
PY
  elif command -v node >/dev/null 2>&1; then
    node -e 'console.log(Math.floor(Math.random()*65536))' || true
  else
    # $RANDOM is Bash-specific; range 0..32767 — combine two calls
    echo $(( (RANDOM<<1) ^ RANDOM ))
  fi
}

rand_between() {
  local min=$1 max=$2
  local span=$((max - min + 1))
  local n
  n=$(rand_u16)
  # Fallback if RNG somehow failed
  if [[ -z "${n}" ]]; then n=0; fi
  echo $(( min + (n % span) ))
}

random_hms() {
  # Returns HH:MM:SS (00..23, 00..59, 00..59)
  local hh mm ss
  hh=$(rand_between 0 23)
  mm=$(rand_between 0 59)
  ss=$(rand_between 0 59)
  printf "%02d:%02d:%02d" "$hh" "$mm" "$ss"
}

# ---------- Find previous commit date (UTC) ----------
if git rev-parse --git-dir >/dev/null 2>&1; then
  :
else
  echo "❌ Not a git repository"; exit 1
fi

last_iso=$(git log -1 --format=%cI 2>/dev/null || true)
if [[ -z "${last_iso}" ]]; then
  # First commit in repo: just use now (UTC) for baseline.
  last_iso=$(date -u -Iseconds)
fi

# Convert to epoch (UTC) and extract Y-M-D (UTC)
last_epoch=$(date -u -d "${last_iso}" +%s)
last_day=$(date -u -d "${last_iso}" +%F)
# End of that UTC day (23:59:59)
last_eod_epoch=$(date -u -d "${last_day} 23:59:59" +%s)

# ---------- 50/50 decision ----------
coin=$(( $(rand_u16) % 2 ))   # 0 or 1
advance_days=0
commit_epoch=

if [[ "${coin}" -eq 0 ]]; then
  # SAME DAY path — choose a time strictly after last_epoch, within the same day
  # If we're at/after end-of-day (very unlikely), fall back to +1..7 days.
  if (( last_epoch < last_eod_epoch )); then
    # Choose offset between 1 second and (last_eod_epoch - last_epoch)
    max_delta=$(( last_eod_epoch - last_epoch ))
    add_sec=$(rand_between 1 "${max_delta}")
    commit_epoch=$(( last_epoch + add_sec ))
  else
    advance_days=$(rand_between 1 7)
  fi
fi

if [[ -z "${commit_epoch}" ]]; then
  # +[1..7] DAYS path — pick a random time of day
  if [[ "${advance_days}" -eq 0 ]]; then
    advance_days=$(rand_between 1 7)
  fi
  base_day_epoch=$(date -u -d "${last_day} 00:00:00" +%s)
  target_day_epoch=$(( base_day_epoch + (advance_days*86400) ))
  # random time of day
  hhmmss=$(random_hms)
  commit_epoch=$(date -u -d "@${target_day_epoch}" +%s)
  # add time-of-day seconds
  h=${hhmmss:0:2}; m=${hhmmss:3:2}; s=${hhmmss:6:2}
  tod=$((10#$h*3600 + 10#$m*60 + 10#$s))
  commit_epoch=$(( commit_epoch + tod ))
  # ensure strictly after last commit
  if (( commit_epoch <= last_epoch )); then
    commit_epoch=$(( last_epoch + 1 ))
  fi
fi

commit_iso=$(date -u -d "@${commit_epoch}" +"%Y-%m-%dT%H:%M:%SZ")

GIT_AUTHOR_DATE="${commit_iso}" \
GIT_COMMITTER_DATE="${commit_iso}" \
git commit -m "${msg}" "$@"

echo "🕒 Dated commit at ${commit_iso} (UTC)"

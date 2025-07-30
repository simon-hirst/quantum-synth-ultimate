#!/usr/bin/env bash
# File: scripts/qs_commit.sh
# Usage:
#   scripts/qs_commit.sh "feat(frontend): wire VITE_BACKEND_HOST" [--all] [files...]
# Notes:
# - Implements your dating rule per commit.
# - If --all is passed, runs `git add -A`. Otherwise, adds the listed files.
# - Aborts if there are no staged changes (so you don’t create empty commits by accident).

set -euo pipefail

msg="${1:-}"
shift || true

if [[ -z "$msg" ]]; then
  echo "Commit message required"
  exit 1
fi

stage_all=false
if [[ "${1:-}" == "--all" ]]; then
  stage_all=true
  shift || true
fi

if $stage_all; then
  git add -A
else
  if [[ "$#" -gt 0 ]]; then
    git add "$@"
  fi
fi

# Ensure there is something to commit
if git diff --cached --quiet; then
  echo "No staged changes to commit."
  exit 1
fi

# Read last commit date (committer date, ISO 8601). If none, use now.
last_iso="$(git log -1 --format=%cI 2>/dev/null || true)"
if [[ -z "$last_iso" ]]; then
  last_iso="$(date -Iseconds)"
fi

# Helpers
rand_between() { # inclusive
  local lo="$1" hi="$2"
  echo $(( lo + RANDOM % (hi - lo + 1) ))
}

iso_to_epoch() {
  date -d "$1" +%s
}

epoch_to_iso() {
  date -Iseconds -d "@$1"
}

# Decide same-day vs +days (50/50)
same_day=$(( RANDOM % 2 ))   # 0 or 1

last_epoch="$(iso_to_epoch "$last_iso")"
last_day="$(date -d "$last_iso" +%Y-%m-%d)"

if [[ "$same_day" -eq 1 ]]; then
  # Same calendar date, but later time (add 5–180 mins, clamped to day end)
  add_mins="$(rand_between 5 180)"
  candidate_epoch=$(( last_epoch + add_mins * 60 ))

  # End of last_day at 23:59:59 (local time)
  day_end_epoch="$(iso_to_epoch "${last_day}T23:59:59")"
  if (( candidate_epoch > day_end_epoch )); then
    candidate_epoch=$(( day_end_epoch - $(rand_between 1 30) )) # keep it just before midnight
    if (( candidate_epoch <= last_epoch )); then
      candidate_epoch=$(( last_epoch + 60 )) # ensure strictly after
    fi
  fi
  new_iso="$(epoch_to_iso "$candidate_epoch")"
else
  # Advance by 1–7 days; random clock time
  add_days="$(rand_between 1 7)"
  new_day="$(date -d "${last_day} +${add_days} days" +%Y-%m-%d)"
  hh="$(printf "%02d" "$(rand_between 9 22)")"
  mm="$(printf "%02d" "$(rand_between 0 59)")"
  ss="$(printf "%02d" "$(rand_between 0 59)")"
  new_iso="${new_day}T${hh}:${mm}:${ss}"
fi

# Commit with controlled dates
GIT_AUTHOR_DATE="$new_iso" \
GIT_COMMITTER_DATE="$new_iso" \
git commit -m "$msg"

echo "✔ committed with date: $new_iso"

# 0) Safety: bail if you’ve got local edits
git diff --quiet || { echo "❌ Working tree not clean. Commit/stash or discard first."; exit 1; }

# 1) Start from master (or main)
git checkout master
git pull --rebase

# 2) Work on a temp branch
branch="integrate-stash-$(date +%Y%m%d%H%M%S)"
git checkout -b "$branch"

# 3) Apply stashes oldest→newest (so newer ones can override earlier ones)
#    If a conflict happens, resolve it, `git add -A`, then rerun the loop from the next ref.
#    --index tries to restore staged intent when the stash was created.
mapfile -t REFS < <(git stash list | awk -F: '{print $1}')
for ((i=${#REFS[@]}-1; i>=0; i--)); do
  ref="${REFS[$i]}"
  echo "→ Applying $ref"
  git stash apply --index "$ref" || {
    echo "⚠️ Resolve conflicts, then 'git add -A' and press Enter to continue."
    read _
  }
done

# 4) One squashed commit
git add -A
git commit -m "Squash: integrate all stashes onto master"

# 5) Merge back to master
git checkout master
git merge --no-ff "$branch" -m "Merge stash integration (squashed)"

# 6) Optional: clear stashes after you’re happy
# git stash clear

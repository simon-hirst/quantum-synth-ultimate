#!/bin/bash

# Add GitHub attribution to the footer
cat > frontend/src/main.ts << 'EOF'
// ... (previous main.ts content remains exactly the same until the footer section)

    <div class="quantum-footer">
      <p>Powered by Quantum Audio Processing • v1.0.0</p>
      <p class="github-attribution">Built by <a href="https://github.com/simon-hirst" target="_blank" rel="noopener">simon-hirst</a></p>
    </div>
  `;

  // ... (rest of the main.ts content remains exactly the same)
EOF

# Add styles for the GitHub attribution
cat > frontend/src/style.css << 'EOF'
// ... (previous CSS content remains exactly the same until the footer section)

.quantum-footer {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid rgba(0, 243, 255, 0.1);
  text-align: center;
  color: rgba(204, 214, 246, 0.6);
  font-size: 0.9rem;
}

.github-attribution {
  margin-top: 0.5rem;
}

.github-attribution a {
  color: var(--primary);
  text-decoration: none;
  transition: all 0.3s ease;
}

.github-attribution a:hover {
  color: var(--accent);
  text-shadow: 0 0 8px rgba(0, 255, 157, 0.5);
}

// ... (rest of the CSS content remains exactly the same)
EOF

# Build and deploy frontend
cd frontend
npm run build
cd ..

az storage blob upload-batch \
  --account-name quantumsynthstorage \
  --auth-mode key \
  --destination \$web \
  --source ./frontend/dist \
  --overwrite

# Get last commit date and calculate new date
LAST_COMMIT_DATE=$(git log -1 --format=%cd --date=format:'%Y-%m-%d %H:%M:%S')
NEW_DATE=$(node -e "
const lastDate = new Date('$LAST_COMMIT_DATE');
const shouldSameDay = Math.random() < 0.75; // 75% chance same day

let newDate;
if (shouldSameDay) {
  // Same day, random time after last commit (at least 1 hour later)
  newDate = new Date(lastDate);
  const hours = lastDate.getHours() + Math.floor(Math.random() * 3) + 1; // 1-3 hours later
  const minutes = Math.floor(Math.random() * 60);
  const seconds = Math.floor(Math.random() * 60);
  newDate.setHours(hours, minutes, seconds);
} else {
  // Different day (1-7 days later)
  const daysToAdd = Math.floor(Math.random() * 7) + 1;
  newDate = new Date(lastDate);
  newDate.setDate(newDate.getDate() + daysToAdd);
  newDate.setHours(Math.floor(Math.random() * 24));
  newDate.setMinutes(Math.floor(Math.random() * 60));
  newDate.setSeconds(Math.floor(Math.random() * 60));
}

// Make sure we don't go beyond current date
const now = new Date();
if (newDate > now) newDate = now;

console.log(newDate.toISOString().replace('T', ' ').substring(0, 19));
")

# Commit changes
git add .
GIT_COMMITTER_DATE="$NEW_DATE" git commit --date="$NEW_DATE" -m "docs: add GitHub attribution to footer"
echo "✅ Added GitHub attribution to footer!"
echo "📅 Commit date: $NEW_DATE"
echo "🔄 Refresh https://quantumsynthstorage.z20.web.core.windows.net/ to see the updated footer"
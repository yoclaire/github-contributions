#!/usr/bin/env bash
set -euo pipefail

# Wrapper around `npm run sync` (src/sync.ts) — the HTML-scrape path,
# which captures private and org contributions. The previous inline
# GraphQL implementation only saw public contributions.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -d node_modules ]]; then
  npm ci
fi

npm run sync

git add data/contributions.json

if git diff --cached --quiet; then
  echo "No changes to commit"
else
  git commit -m "stats: update contributions $(date +%Y-%m-%d)"
  git pull --rebase
  git push
  echo "Pushed updated contributions"
fi

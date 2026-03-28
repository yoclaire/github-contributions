#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="${SCRIPT_DIR}/data"

USERNAME="${1:-yoclaire}"
ACCOUNT_CREATED="2023-09-13"
TODAY=$(date +%Y-%m-%d)

echo "Fetching contributions for ${USERNAME} from ${ACCOUNT_CREATED} to ${TODAY}"

# Build date ranges (1-year chunks)
ALL_DAYS="[]"
CURRENT_START="${ACCOUNT_CREATED}"

while [[ "${CURRENT_START}" < "${TODAY}" ]]; do
  # End is 1 year after start, or today, whichever is earlier
  YEAR_END=$(date -j -v+1y -f "%Y-%m-%d" "${CURRENT_START}" "+%Y-%m-%d" 2>/dev/null || date -d "${CURRENT_START} + 1 year" "+%Y-%m-%d")
  if [[ "${YEAR_END}" > "${TODAY}" ]]; then
    YEAR_END="${TODAY}"
  fi

  echo "  Querying ${CURRENT_START} to ${YEAR_END}..."

  CHUNK=$(gh api graphql -f query='
    query($username: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $username) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
              }
            }
          }
        }
      }
    }
  ' -f username="${USERNAME}" -f from="${CURRENT_START}T00:00:00Z" -f to="${YEAR_END}T23:59:59Z" \
    --jq '[.data.user.contributionsCollection.contributionCalendar.weeks[].contributionDays[] | {date: .date, count: .contributionCount}]')

  # Merge into ALL_DAYS
  ALL_DAYS=$(echo "${ALL_DAYS}" "${CHUNK}" | jq -s '.[0] + .[1]')

  CURRENT_START="${YEAR_END}"
done

# Compute total
TOTAL=$(echo "${ALL_DAYS}" | jq '[.[].count] | add // 0')

# Write output
jq -n \
  --arg updated "${TODAY}" \
  --argjson total "${TOTAL}" \
  --argjson daily "${ALL_DAYS}" \
  '{
    lastUpdated: $updated,
    totalContributions: $total,
    dailyContributions: $daily
  }' > "${DATA_DIR}/contributions.json"

echo "Wrote ${DATA_DIR}/contributions.json (${TOTAL} total contributions)"

# Git operations
cd "$SCRIPT_DIR"
git add "data/contributions.json"

if git diff --cached --quiet; then
  echo "No changes to commit"
else
  git commit -m "stats: update contributions $(date +%Y-%m-%d)"
  git push
  echo "Pushed updated contributions"
fi

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { ContributionData, DailyContribution } from "./types.js";

const USERNAME = "yoclaire";
const DATA_FILE = join(process.cwd(), "data", "contributions.json");

function fetchYearHtml(year: number): string {
  const url = `https://github.com/users/${USERNAME}/contributions?from=${year}-12-01`;
  return execSync(`curl -s "${url}"`, { encoding: "utf-8" });
}

function parseDailyContributions(html: string): DailyContribution[] {
  const days: DailyContribution[] = [];

  const dateRegex = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*id="(contribution-day-component-[^"]+)"/g;
  const tooltipMap = new Map<string, string>();

  // Build map of component id -> tooltip text
  const tipRegex = /for="(contribution-day-component-[^"]+)"[^>]*>([^<]+)<\/tool-tip>/g;
  let match;
  while ((match = tipRegex.exec(html)) !== null) {
    tooltipMap.set(match[1], match[2]);
  }

  // Extract date -> count from cells + tooltips
  while ((match = dateRegex.exec(html)) !== null) {
    const date = match[1];
    const id = match[2];
    const tip = tooltipMap.get(id) ?? "";

    let count = 0;
    const countMatch = tip.match(/^(\d+)\s+contribution/);
    if (countMatch) {
      count = parseInt(countMatch[1], 10);
    }

    days.push({ date, count });
  }

  return days;
}

function getContributionYears(): number[] {
  // Try gh CLI first (local dev), fall back to deriving from existing data + current year
  try {
    const result = execSync(
      `gh api graphql -f query='{ viewer { contributionsCollection { contributionYears } } }' --jq '.data.viewer.contributionsCollection.contributionYears'`,
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return JSON.parse(result).sort() as number[];
  } catch {
    // In CI or without gh: use existing data range through current year
    let earliest = new Date().getFullYear();
    try {
      const data: ContributionData = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
      if (data.dailyContributions.length > 0) {
        earliest = parseInt(data.dailyContributions[0].date.slice(0, 4), 10);
      }
    } catch { /* no existing data */ }
    const current = new Date().getFullYear();
    const years: number[] = [];
    for (let y = earliest; y <= current; y++) years.push(y);
    return years;
  }
}

function mergeHighWaterMark(
  existing: DailyContribution[],
  scraped: DailyContribution[]
): DailyContribution[] {
  const map = new Map<string, number>();

  for (const d of existing) {
    map.set(d.date, d.count);
  }

  for (const d of scraped) {
    const prev = map.get(d.date) ?? 0;
    map.set(d.date, Math.max(prev, d.count));
  }

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}

// Main
const years = getContributionYears();
console.log(`Found contribution years: ${years.join(", ")}`);

const allScraped: DailyContribution[] = [];

for (const year of years) {
  console.log(`Fetching ${year}...`);
  const html = fetchYearHtml(year);
  const days = parseDailyContributions(html);
  console.log(`  ${days.length} days, ${days.reduce((s, d) => s + d.count, 0)} contributions`);
  allScraped.push(...days);
}

// Load existing data
let existing: ContributionData = {
  lastUpdated: "",
  totalContributions: 0,
  dailyContributions: [],
};
try {
  existing = JSON.parse(readFileSync(DATA_FILE, "utf-8"));
} catch {
  // First run, no existing data
}

const merged = mergeHighWaterMark(existing.dailyContributions, allScraped);
const totalContributions = merged.reduce((s, d) => s + d.count, 0);

const result: ContributionData = {
  lastUpdated: new Date().toISOString().slice(0, 10),
  totalContributions,
  dailyContributions: merged,
};

writeFileSync(DATA_FILE, JSON.stringify(result, null, 2) + "\n", "utf-8");
console.log(`\nSynced: ${totalContributions} total contributions across ${merged.length} days`);
console.log(`Previous total: ${existing.totalContributions}`);

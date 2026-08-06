import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import { ContributionData, DailyContribution } from "./types.js";
import {
  parseYearHtml,
  mergeHighWaterMark,
  pruneEmptyLeadingYears,
} from "./sync-core.js";

const USERNAME = "yoclaire";
const DATA_FILE = join(process.cwd(), "data", "contributions.json");

function fetchYearHtml(year: number): string {
  const url = `https://github.com/users/${USERNAME}/contributions?from=${year}-12-01`;
  // -f: fail on HTTP errors (429 etc.) instead of parsing an error page
  return execFileSync("curl", ["-sf", url], { encoding: "utf-8" });
}

function getContributionYears(existing: DailyContribution[]): number[] {
  // Try gh CLI first (local dev), fall back to deriving from existing data + current year
  try {
    const result = execFileSync(
      "gh",
      [
        "api", "graphql",
        "-f", "query={ viewer { contributionsCollection { contributionYears } } }",
        "--jq", ".data.viewer.contributionsCollection.contributionYears",
      ],
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
    );
    return JSON.parse(result).sort() as number[];
  } catch {
    // In CI or without gh: use existing data range through current year
    const current = new Date().getFullYear();
    let earliest = current;
    if (existing.length > 0) {
      earliest = parseInt(existing[0].date.slice(0, 4), 10);
    }
    const years: number[] = [];
    for (let y = earliest; y <= current; y++) years.push(y);
    return years;
  }
}

// Main
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

// Drop inactive leading years (a bad scrape once seeded zero-count days back
// to 1969, which made CI fetch 58 year pages and get rate-limited)
existing.dailyContributions = pruneEmptyLeadingYears(existing.dailyContributions);

const years = getContributionYears(existing.dailyContributions);
console.log(`Found contribution years: ${years.join(", ")}`);

const allScraped: DailyContribution[] = [];

for (const year of years) {
  console.log(`Fetching ${year}...`);
  const html = fetchYearHtml(year);
  const days = parseYearHtml(html, year);
  console.log(`  ${days.length} days, ${days.reduce((s, d) => s + d.count, 0)} contributions`);
  allScraped.push(...days);
  execFileSync("sleep", ["1"]); // don't hammer github.com from one IP
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

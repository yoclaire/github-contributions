import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import { ContributionData, DailyContribution } from "./types.js";
import {
  parseYearHtml,
  mergeHighWaterMark,
  pruneEmptyLeadingYears,
} from "./sync-core.js";

// This script must run from a residential IP (i.e. one of Claire's machines,
// via sync-contributions.sh). It scrapes the profile calendar HTML because
// that is the only per-day source that includes private/org contributions:
// the GraphQL contributionCalendar exposes them only as an aggregate
// restrictedContributionsCount, and GitHub serves count-less calendar pages
// to Actions runner IPs. CI just renders the SVG from the committed data.
const USERNAME = "yoclaire";
const DATA_FILE = join(process.cwd(), "data", "contributions.json");

function fetchYearHtml(year: number): string {
  const url = `https://github.com/users/${USERNAME}/contributions?from=${year}-12-01`;
  // -f: fail on HTTP errors (429 etc.) instead of parsing an error page
  return execFileSync("curl", ["-sf", url], { encoding: "utf-8" });
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
existing.dailyContributions = pruneEmptyLeadingYears(existing.dailyContributions);

const currentYear = new Date().getFullYear();
const earliest =
  existing.dailyContributions.length > 0
    ? parseInt(existing.dailyContributions[0].date.slice(0, 4), 10)
    : currentYear;
const years: number[] = [];
for (let y = earliest; y <= currentYear; y++) years.push(y);
console.log(`Syncing years: ${years.join(", ")}`);

const allScraped: DailyContribution[] = [];

for (const year of years) {
  console.log(`Fetching ${year}...`);
  const html = fetchYearHtml(year);
  const days = parseYearHtml(html, year);
  console.log(`  ${days.length} days, ${days.reduce((s, d) => s + d.count, 0)} contributions`);
  allScraped.push(...days);
  execFileSync("sleep", ["1"]); // don't hammer github.com from one IP
}

// Prune after merging so junk zero-count years can never accumulate again
// (a bad sync once seeded zero-count days back to 1969)
const merged = pruneEmptyLeadingYears(
  mergeHighWaterMark(existing.dailyContributions, allScraped)
);
const totalContributions = merged.reduce((s, d) => s + d.count, 0);

const result: ContributionData = {
  lastUpdated: new Date().toISOString().slice(0, 10),
  totalContributions,
  dailyContributions: merged,
};

writeFileSync(DATA_FILE, JSON.stringify(result, null, 2) + "\n", "utf-8");
console.log(`\nSynced: ${totalContributions} total contributions across ${merged.length} days`);
console.log(`Previous total: ${existing.totalContributions}`);

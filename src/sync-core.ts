import { DailyContribution } from "./types.js";

export function mergeHighWaterMark(
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

export function parseYearHtml(html: string, year: number): DailyContribution[] {
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

  if (days.length === 0) {
    throw new Error(
      `Parsed 0 days for ${year} — GitHub may be rate-limiting or the calendar HTML changed`
    );
  }

  return days;
}

export function pruneEmptyLeadingYears(
  days: DailyContribution[]
): DailyContribution[] {
  const firstActive = days.find((d) => d.count > 0);
  if (!firstActive) return [];
  const firstYear = firstActive.date.slice(0, 4);
  return days.filter((d) => d.date >= `${firstYear}-01-01`);
}

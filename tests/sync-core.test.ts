import { describe, it, expect } from "vitest";
import {
  parseYearHtml,
  mergeHighWaterMark,
  pruneEmptyLeadingYears,
} from "../src/sync-core.js";

const SAMPLE_HTML = `
<td data-date="2026-01-05" id="contribution-day-component-0-1"></td>
<td data-date="2026-01-06" id="contribution-day-component-0-2"></td>
<tool-tip for="contribution-day-component-0-1">3 contributions on January 5th.</tool-tip>
<tool-tip for="contribution-day-component-0-2">No contributions on January 6th.</tool-tip>
`;

describe("parseYearHtml", () => {
  it("parses dates and counts from calendar HTML", () => {
    expect(parseYearHtml(SAMPLE_HTML, 2026)).toEqual([
      { date: "2026-01-05", count: 3 },
      { date: "2026-01-06", count: 0 },
    ]);
  });

  it("throws when no day cells are found (rate-limited or error page)", () => {
    expect(() => parseYearHtml("<html>429</html>", 2026)).toThrow(/2026/);
  });
});

describe("mergeHighWaterMark", () => {
  it("keeps the higher count per date", () => {
    const merged = mergeHighWaterMark(
      [{ date: "2026-01-05", count: 5 }],
      [{ date: "2026-01-05", count: 3 }]
    );
    expect(merged).toEqual([{ date: "2026-01-05", count: 5 }]);
  });

  it("preserves existing dates missing from the scrape", () => {
    const merged = mergeHighWaterMark(
      [{ date: "2025-06-01", count: 2 }],
      [{ date: "2026-01-05", count: 1 }]
    );
    expect(merged).toEqual([
      { date: "2025-06-01", count: 2 },
      { date: "2026-01-05", count: 1 },
    ]);
  });
});

describe("pruneEmptyLeadingYears", () => {
  it("drops days from years before the first year with activity", () => {
    const pruned = pruneEmptyLeadingYears([
      { date: "1969-01-01", count: 0 },
      { date: "2022-12-31", count: 0 },
      { date: "2023-01-01", count: 0 },
      { date: "2023-03-15", count: 4 },
    ]);
    expect(pruned).toEqual([
      { date: "2023-01-01", count: 0 },
      { date: "2023-03-15", count: 4 },
    ]);
  });

  it("keeps zero-count days within the first active year", () => {
    const pruned = pruneEmptyLeadingYears([
      { date: "2023-01-01", count: 0 },
      { date: "2023-03-15", count: 4 },
    ]);
    expect(pruned).toHaveLength(2);
  });

  it("returns empty when there is no activity at all", () => {
    expect(
      pruneEmptyLeadingYears([{ date: "1969-01-01", count: 0 }])
    ).toEqual([]);
  });
});

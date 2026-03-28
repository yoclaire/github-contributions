import { describe, it, expect } from "vitest";
import { renderSvg } from "../src/render.js";
import { ContributionData } from "../src/types.js";

const data: ContributionData = {
  lastUpdated: "2026-03-27",
  totalContributions: 1234,
  dailyContributions: [
    { date: "2026-03-20", count: 3 },
    { date: "2026-03-21", count: 7 },
    { date: "2026-03-22", count: 1 },
  ],
};

describe("renderSvg", () => {
  it("returns valid SVG", () => {
    const svg = renderSvg(data, "2026-03-27");
    expect(svg).toMatch(/^<svg /);
    expect(svg).toMatch(/<\/svg>$/);
  });
  it("includes total contributions", () => {
    const svg = renderSvg(data, "2026-03-27");
    // 1234 is formatted as "1.2K" by formatCount
    expect(svg).toContain("1.2K");
  });
  it("includes title", () => {
    const svg = renderSvg(data, "2026-03-27");
    expect(svg).toContain("GitHub Contributions");
  });
  it("includes heatmap", () => {
    const svg = renderSvg(data, "2026-03-27");
    const rectCount = (svg.match(/<rect /g) || []).length;
    expect(rectCount).toBeGreaterThan(300);
  });
  it("includes legend", () => {
    const svg = renderSvg(data, "2026-03-27");
    expect(svg).toContain("Less");
    expect(svg).toContain("More");
  });
  it("includes recent contributions summary", () => {
    const svg = renderSvg(data, "2026-03-27");
    expect(svg).toMatch(/contributions in the last year/);
  });
  it("includes last snapshot date", () => {
    const svg = renderSvg(data, "2026-03-27");
    expect(svg).toContain("2026-03-27");
  });
  it("includes preserved footer", () => {
    const svg = renderSvg(data, "2026-03-27");
    expect(svg).toContain("Preserved contribution history");
  });
});

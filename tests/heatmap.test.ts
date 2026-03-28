import { describe, it, expect } from "vitest";
import { buildHeatmapGrid } from "../src/heatmap.js";

describe("buildHeatmapGrid", () => {
  const today = "2026-03-27";

  it("returns ~52 weeks for 1 year window", () => {
    const grid = buildHeatmapGrid([], today);
    expect(grid.weekCount).toBeGreaterThanOrEqual(52);
    expect(grid.weekCount).toBeLessThanOrEqual(54);
  });

  it("maps contribution counts to cells", () => {
    const grid = buildHeatmapGrid([{ date: "2026-03-27", count: 5 }], today);
    const cell = grid.cells.find(c => c.date === "2026-03-27");
    expect(cell?.count).toBe(5);
  });

  it("computes recentContributions", () => {
    const { recentContributions } = buildHeatmapGrid([
      { date: "2026-03-20", count: 3 },
      { date: "2026-03-21", count: 7 },
    ], today);
    expect(recentContributions).toBe(10);
  });

  it("assigns intensity levels", () => {
    // With counts [1,2,3,4,5,6,7,8,9,10,15,20], p75=9, so 20 > p75 => level 4
    const grid = buildHeatmapGrid([
      { date: "2026-02-01", count: 1 },
      { date: "2026-02-02", count: 2 },
      { date: "2026-02-03", count: 3 },
      { date: "2026-02-04", count: 4 },
      { date: "2026-02-05", count: 5 },
      { date: "2026-02-06", count: 6 },
      { date: "2026-02-07", count: 7 },
      { date: "2026-02-08", count: 8 },
      { date: "2026-02-09", count: 9 },
      { date: "2026-02-10", count: 10 },
      { date: "2026-02-11", count: 15 },
      { date: "2026-02-12", count: 20 },
    ], today);
    const empty = grid.cells.find(c => c.date === "2026-03-25");
    expect(empty?.level).toBe(0);
    const high = grid.cells.find(c => c.date === "2026-02-12");
    expect(high?.level).toBe(4);
  });
});

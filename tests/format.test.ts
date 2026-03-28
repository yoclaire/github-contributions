import { describe, it, expect } from "vitest";
import { formatCount } from "../src/format.js";

describe("formatCount", () => {
  it("formats numbers under 1000 as-is", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatCount(217)).toBe("217");
    expect(formatCount(999)).toBe("999");
  });
  it("formats thousands with K", () => {
    expect(formatCount(1000)).toBe("1.0K");
    expect(formatCount(1234)).toBe("1.2K");
  });
  it("formats millions with M", () => {
    expect(formatCount(1000000)).toBe("1.0M");
  });
});

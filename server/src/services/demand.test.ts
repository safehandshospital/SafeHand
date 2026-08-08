import { describe, expect, it } from "vitest";
import { demandLevelForSlot, rankSlotsByDemand } from "./demand.js";

describe("demandLevelForSlot", () => {
  it("marks quiet late afternoon mid-week as lower demand when empty", () => {
    // Wednesday 16:00
    const d = new Date(2026, 2, 4, 16, 0, 0);
    const result = demandLevelForSlot(d, 0);
    expect(result.score).toBeLessThan(0.5);
  });

  it("marks Monday morning with high fill as HIGH", () => {
    const d = new Date(2026, 2, 2, 10, 0, 0); // Monday
    const result = demandLevelForSlot(d, 0.9);
    expect(result.level).toBe("HIGH");
  });
});

describe("rankSlotsByDemand", () => {
  it("prefers lower demand scores", () => {
    const ranked = rankSlotsByDemand([
      { demandScore: 0.8, remaining: 1 },
      { demandScore: 0.2, remaining: 1 },
      { demandScore: 0.5, remaining: 2 },
    ]);
    expect(ranked[0].demandScore).toBe(0.2);
  });
});

import { describe, expect, it } from "vitest";
import {
  assessRequestedWindow,
  bucketDemandByWindow,
  demandLevelForSlot,
  quieterWindows,
  rankSlotsByDemand,
} from "./demand.js";

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

function slot(dayOffset: number, hour: number, bookedCount = 0, capacity = 1) {
  // Fix the reference Monday so buckets stay deterministic across runs.
  const base = new Date(2026, 2, 2, 0, 0, 0); // Monday
  const startsAt = new Date(base);
  startsAt.setDate(startsAt.getDate() + dayOffset);
  startsAt.setHours(hour, 0, 0, 0);
  return { startsAt, capacity, bookedCount };
}

describe("bucketDemandByWindow", () => {
  it("groups slots by weekday and hour and averages the fill ratio", () => {
    const windows = bucketDemandByWindow([
      slot(0, 9, 1, 1),
      slot(7, 9, 0, 1),
      slot(0, 15, 0, 1),
    ]);

    const monday9 = windows.find((w) => w.weekday === 1 && w.hour === 9);
    expect(monday9?.slotCount).toBe(2);
    expect(monday9?.fillRatio).toBe(0.5);
    expect(monday9?.level).toBe("HIGH");
    expect(windows.some((w) => w.weekday === 1 && w.hour === 15)).toBe(true);
  });
});

describe("assessRequestedWindow", () => {
  const windows = bucketDemandByWindow([
    slot(0, 9, 1, 1), // Monday 09:00 fully booked
    slot(0, 10, 1, 1), // Monday 10:00 fully booked
    slot(0, 14, 0, 1),
    slot(0, 16, 0, 1),
    slot(1, 15, 0, 1),
  ]);

  it("flags a booked peak window as usually busy", () => {
    const result = assessRequestedWindow({
      requested: { weekday: 1, hour: 9, fillRatio: 1 },
      windows,
    });
    expect(result.usuallyBusy).toBe(true);
    expect(result.level).toBe("HIGH");
  });

  it("does not flag an empty quiet afternoon as busy", () => {
    const result = assessRequestedWindow({
      requested: { weekday: 2, hour: 15, fillRatio: 0 },
      windows,
    });
    expect(result.usuallyBusy).toBe(false);
    expect(result.level).toBe("LOW");
  });

  it("reports the busiest windows in descending score order", () => {
    const result = assessRequestedWindow({
      requested: { weekday: 1, hour: 16, fillRatio: 0 },
      windows,
    });
    expect(result.busiest[0].weekday).toBe(1);
    expect(result.busiest[0].hour).toBe(9);
    expect(result.busiest[0].score).toBeGreaterThanOrEqual(result.busiest[1].score);
  });
});

describe("quieterWindows", () => {
  it("returns the quietest open windows and skips booked or excluded ones", () => {
    const quiet = quieterWindows(
      [
        slot(0, 9, 1, 1), // booked, skipped
        slot(0, 10, 0, 1),
        slot(0, 16, 0, 1),
        slot(1, 11, 0, 1),
      ],
      { excludeStartsAt: slot(0, 10).startsAt, limit: 3 },
    );

    expect(quiet.every((w) => w.level !== "HIGH")).toBe(true);
    expect(quiet.some((w) => w.startsAt.getHours() === 10 && w.startsAt.getDay() === 1)).toBe(false);
    expect(quiet.length).toBeGreaterThan(0);
    expect(quiet[0].score).toBeLessThanOrEqual(quiet[quiet.length - 1].score);
  });
});

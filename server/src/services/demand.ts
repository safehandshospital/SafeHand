/** Heuristic demand scoring used when OpenAI is unavailable and for slot enrichment. */

export type DemandLevel = "LOW" | "MEDIUM" | "HIGH";

export function demandLevelForSlot(
  startsAt: Date,
  fillRatio: number,
): { level: DemandLevel; score: number } {
  const hour = startsAt.getHours();
  const weekday = startsAt.getDay(); // 0 Sun

  let score = fillRatio;

  // Peak outpatient hours
  if (hour >= 9 && hour <= 11) score += 0.25;
  if (hour >= 14 && hour <= 16) score += 0.2;
  // Midday lull
  if (hour === 12 || hour === 13) score -= 0.1;
  // Early / late quieter
  if (hour < 9 || hour >= 17) score -= 0.15;
  // Weekends quieter in many outpatient settings
  if (weekday === 0 || weekday === 6) score -= 0.2;
  // Monday morning surge
  if (weekday === 1 && hour >= 9 && hour <= 11) score += 0.15;

  score = Math.max(0, Math.min(1, score));

  let level: DemandLevel = "MEDIUM";
  if (score < 0.35) level = "LOW";
  else if (score >= 0.7) level = "HIGH";

  return { level, score: Number(score.toFixed(3)) };
}

export function rankSlotsByDemand<T extends { demandScore: number; remaining: number }>(
  slots: T[],
): T[] {
  return [...slots].sort((a, b) => {
    // Prefer lower demand, then more remaining capacity
    if (a.demandScore !== b.demandScore) return a.demandScore - b.demandScore;
    return b.remaining - a.remaining;
  });
}

/** One recurring weekday+hour bucket of demand for a single clinic. */
export type DemandWindow = {
  weekday: number;
  hour: number;
  level: DemandLevel;
  score: number;
  fillRatio: number;
  slotCount: number;
};

/** 2026-01-04 is a Sunday, so adding `weekday` lands on the matching weekday. */
const WEEKDAY_REFERENCE = new Date(2026, 0, 4);

export function weekdayHourReference(weekday: number, hour: number): Date {
  const date = new Date(WEEKDAY_REFERENCE);
  date.setDate(date.getDate() + weekday);
  date.setHours(hour, 0, 0, 0);
  return date;
}

/**
 * Collapses upcoming slots into recurring weekday+hour demand buckets so the
 * assistant can describe a hospital's usual busy pattern instead of one day.
 */
export function bucketDemandByWindow(
  slots: Array<{ startsAt: Date; capacity: number; bookedCount: number }>,
): DemandWindow[] {
  const buckets = new Map<string, { booked: number; capacity: number; count: number }>();

  for (const slot of slots) {
    const key = `${slot.startsAt.getDay()}-${slot.startsAt.getHours()}`;
    const current = buckets.get(key) ?? { booked: 0, capacity: 0, count: 0 };
    current.booked += slot.bookedCount;
    current.capacity += slot.capacity;
    current.count += 1;
    buckets.set(key, current);
  }

  return [...buckets.entries()]
    .map(([key, value]) => {
      const [weekday, hour] = key.split("-").map(Number);
      const fillRatio = value.capacity ? value.booked / value.capacity : 0;
      const demand = demandLevelForSlot(weekdayHourReference(weekday, hour), fillRatio);
      return {
        weekday,
        hour,
        fillRatio: Number(fillRatio.toFixed(3)),
        level: demand.level,
        score: demand.score,
        slotCount: value.count,
      };
    })
    .sort((a, b) => a.weekday - b.weekday || a.hour - b.hour);
}

export function medianScore(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

export type RequestedWindowAssessment = {
  level: DemandLevel;
  score: number;
  /** Peak windows have to clear this bar before we call a time "usually busy". */
  peakScore: number;
  medianScore: number;
  usuallyBusy: boolean;
  busiest: DemandWindow[];
};

const BUSY_SCORE_THRESHOLD = 0.55;
const BUSY_PEAK_CEILING = 0.4;

/**
 * Answers "is this exact time usually busy at this hospital?" by comparing the
 * requested weekday+hour against the clinic's own upcoming demand profile.
 */
export function assessRequestedWindow(input: {
  requested: { weekday: number; hour: number; fillRatio: number };
  windows: DemandWindow[];
  busiestCount?: number;
}): RequestedWindowAssessment {
  const demand = demandLevelForSlot(
    weekdayHourReference(input.requested.weekday, input.requested.hour),
    input.requested.fillRatio,
  );
  const busiest = [...input.windows]
    .sort((a, b) => b.score - a.score || a.weekday - b.weekday || a.hour - b.hour)
    .slice(0, input.busiestCount ?? 4);
  const peakScore = busiest[0]?.score ?? 0;
  const isPeakWindow =
    peakScore >= BUSY_PEAK_CEILING &&
    busiest.some(
      (w) => w.weekday === input.requested.weekday && w.hour === input.requested.hour,
    );

  return {
    level: demand.level,
    score: demand.score,
    peakScore,
    medianScore: Number(medianScore(input.windows.map((w) => w.score)).toFixed(3)),
    usuallyBusy: demand.level === "HIGH" || demand.score >= BUSY_SCORE_THRESHOLD || isPeakWindow,
    busiest,
  };
}

/** Quieter open windows a patient could switch to, best first. */
export function quieterWindows(
  slots: Array<{ startsAt: Date; capacity: number; bookedCount: number }>,
  options: { excludeStartsAt?: Date; limit?: number } = {},
): Array<{ startsAt: Date; level: DemandLevel; score: number; fillRatio: number }> {
  const seen = new Set<string>();
  const excludeAt = options.excludeStartsAt?.getTime();

  return slots
    .filter((slot) => slot.capacity > slot.bookedCount)
    .filter((slot) => (excludeAt ? slot.startsAt.getTime() !== excludeAt : true))
    .map((slot) => {
      const fillRatio = slot.capacity ? slot.bookedCount / slot.capacity : 0;
      const demand = demandLevelForSlot(slot.startsAt, fillRatio);
      return {
        startsAt: slot.startsAt,
        level: demand.level,
        score: demand.score,
        fillRatio: Number(fillRatio.toFixed(3)),
      };
    })
    .sort((a, b) => a.score - b.score || a.startsAt.getTime() - b.startsAt.getTime())
    .filter((slot) => {
      const key = `${slot.startsAt.getDay()}-${slot.startsAt.getHours()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, options.limit ?? 3);
}

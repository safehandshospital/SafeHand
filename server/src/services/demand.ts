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

import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type SlotInput = {
  id: string;
  startsAt: string;
  endsAt: string;
  remaining: number;
  demandLevel: string;
  demandScore: number;
  doctorName: string | null;
};

export type ChatDbContext = {
  /** Doctors available in the department being discussed */
  doctors?: Array<{ fullName: string; specialty: string }>;
  /** Next open slots in the department being discussed */
  upcomingSlots?: Array<{
    startsAt: string;
    remaining: number;
    demandLevel: string;
    doctorName: string | null;
  }>;
  /** Full department directory, used when no single department is in focus */
  departments?: Array<{ name: string; category: string; hours: string }>;
};

export function buildRecommendMessages(input: {
  departmentName: string;
  preference?: string;
  slots: SlotInput[];
}): ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content:
        "You are a healthcare scheduling assistant. Rank available appointment slots to balance patient wait times and clinic load. Prefer LOW demand when clinically reasonable. Return JSON: { summary: string, recommendations: [{ slotId, rank, demandLevel, reason }] } with at most 5 recommendations.",
    },
    {
      role: "user",
      content: JSON.stringify({
        department: input.departmentName,
        preference: input.preference ?? null,
        slots: input.slots.slice(0, 40),
      }),
    },
  ];
}

export function buildChatMessages(input: {
  message: string;
  departmentName?: string;
  context?: ChatDbContext;
}): ChatCompletionMessageParam[] {
  const grounding: string[] = [];

  if (input.context?.doctors?.length) {
    grounding.push(
      `Doctors in this department: ${input.context.doctors
        .map((d) => `${d.fullName} (${d.specialty})`)
        .join(", ")}.`,
    );
  }

  if (input.context?.upcomingSlots?.length) {
    grounding.push(
      `Next open slots: ${input.context.upcomingSlots
        .slice(0, 8)
        .map(
          (s) =>
            `${s.startsAt}${s.doctorName ? ` with ${s.doctorName}` : ""} (${s.demandLevel.toLowerCase()} demand, ${s.remaining} left)`,
        )
        .join("; ")}.`,
    );
  }

  if (input.context?.departments?.length) {
    grounding.push(
      `Available clinic departments: ${input.context.departments
        .map((d) => `${d.name} (${d.category}, ${d.hours || "hours vary"})`)
        .join(", ")}.`,
    );
  }

  const systemParts = [
    "You help patients book healthcare appointments. Be concise, warm, and practical. Suggest preferring lower-demand time windows when possible. Do not give medical diagnoses.",
    "Only state doctor names, specialties, availability, or department details if they are given to you below as real data — never invent them.",
  ];
  if (grounding.length) {
    systemParts.push("Real-time clinic data you may reference:\n" + grounding.join("\n"));
  }

  return [
    { role: "system", content: systemParts.join("\n\n") },
    {
      role: "user",
      content: input.departmentName
        ? `Department context: ${input.departmentName}\n\n${input.message}`
        : input.message,
    },
  ];
}

export function buildOutlookMessages(input: {
  departmentName: string;
  periods: Array<{
    weekday: number;
    hour: number;
    fillRatio: number;
    level: string;
    score: number;
  }>;
}): ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content:
        "You are an operations analyst for outpatient clinics. Summarize demand outlook in 2-4 sentences for hospital staff. Mention peak and quiet windows.",
    },
    {
      role: "user",
      content: JSON.stringify({
        department: input.departmentName,
        periods: input.periods.slice(0, 50),
      }),
    },
  ];
}

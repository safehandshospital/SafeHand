import OpenAI from "openai";

const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

function client(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

type SlotInput = {
  id: string;
  startsAt: string;
  endsAt: string;
  remaining: number;
  demandLevel: string;
  demandScore: number;
  doctorName: string | null;
};

export async function recommendSlots(input: {
  departmentName: string;
  preference?: string;
  slots: SlotInput[];
}): Promise<{
  ok: boolean;
  model: string;
  summary?: string;
  recommendations?: Array<{
    slotId: string;
    rank: number;
    demandLevel: string;
    reason: string;
  }>;
  error?: string;
}> {
  const openai = client();
  if (!openai) {
    return { ok: false, model, error: "OPENAI_API_KEY not configured" };
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
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
      ],
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      summary?: string;
      recommendations?: Array<{
        slotId: string;
        rank: number;
        demandLevel: string;
        reason: string;
      }>;
    };

    return {
      ok: true,
      model,
      summary: parsed.summary ?? "Recommended quieter slots based on demand.",
      recommendations: (parsed.recommendations ?? []).slice(0, 5),
    };
  } catch (err) {
    return {
      ok: false,
      model,
      error: err instanceof Error ? err.message : "OpenAI request failed",
    };
  }
}

export async function chatAssistant(input: {
  message: string;
  departmentName?: string;
}): Promise<{ ok: boolean; model: string; reply?: string; error?: string }> {
  const openai = client();
  if (!openai) {
    return { ok: false, model, error: "OPENAI_API_KEY not configured" };
  }

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content:
            "You help patients book healthcare appointments. Be concise, warm, and practical. Suggest preferring lower-demand time windows when possible. Do not give medical diagnoses.",
        },
        {
          role: "user",
          content: input.departmentName
            ? `Department context: ${input.departmentName}\n\n${input.message}`
            : input.message,
        },
      ],
      temperature: 0.5,
      max_tokens: 400,
    });

    return {
      ok: true,
      model,
      reply: completion.choices[0]?.message?.content?.trim() || "How can I help you book?",
    };
  } catch (err) {
    return {
      ok: false,
      model,
      error: err instanceof Error ? err.message : "OpenAI request failed",
    };
  }
}

export async function demandOutlook(input: {
  departmentName: string;
  periods: Array<{
    weekday: number;
    hour: number;
    fillRatio: number;
    level: string;
    score: number;
  }>;
}): Promise<{ ok: boolean; model: string; outlook?: string; error?: string }> {
  const openai = client();
  if (!openai) {
    return { ok: false, model, error: "OPENAI_API_KEY not configured" };
  }

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL_ADMIN || model,
      messages: [
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
      ],
      temperature: 0.4,
      max_tokens: 350,
    });

    return {
      ok: true,
      model,
      outlook: completion.choices[0]?.message?.content?.trim(),
    };
  } catch (err) {
    return {
      ok: false,
      model,
      error: err instanceof Error ? err.message : "OpenAI request failed",
    };
  }
}

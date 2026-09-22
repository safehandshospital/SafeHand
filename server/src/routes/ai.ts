import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { recommendSlots, chatAssistantAgent, demandOutlook, predictBusyHours } from "../services/ai/provider.js";
import { demandLevelForSlot, rankSlotsByDemand } from "../services/demand.js";
import { assistantTools, executeTool } from "../services/ai/tools.js";

const recommendSchema = z.object({
  departmentId: z.string().min(1),
  preference: z.string().max(500).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  departmentId: z.string().optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(2000),
      }),
    )
    .max(12)
    .optional(),
});

const outlookSchema = z.object({
  departmentId: z.string().min(1),
});

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("en-GH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function requestedDayRange(text: string) {
  const now = new Date();
  const start = new Date(now);
  if (/\btomorrow\b/.test(text)) {
    start.setDate(start.getDate() + 1);
  }
  if (/\bthis week\b/.test(text)) {
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  start.setHours(/\btoday\b/.test(text) ? now.getHours() : 0, /\btoday\b/.test(text) ? now.getMinutes() : 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  if (/\btoday\b|\btomorrow\b/.test(text)) return { start, end };
  return { start: now, end: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) };
}

function departmentAlias(text: string) {
  if (/\bheart|cardio|cardiology|chest pain|blood pressure\b/.test(text)) return "Cardiology";
  if (/\bskin|rash|acne|eczema|dermatology\b/.test(text)) return "Dermatology";
  if (/\bemergency|urgent|ridge\b/.test(text)) return "Emergency Medicine";
  if (/\bkidney|urology|urinary|nephrology|korle\b/.test(text)) return "Nephrology & Urology";
  if (/\bbone|joint|knee|orthopedic|orthopaedic|orthopedics\b/.test(text)) return "Orthopedics";
  if (/\bchild|children|kid|pediatric|paediatric|pediatrics\b/.test(text)) return "Pediatrics";
  return null;
}

function ordinalIndex(text: string) {
  if (/\b(first|1st|number one|#1)\b/.test(text)) return 0;
  if (/\b(second|2nd|number two|#2)\b/.test(text)) return 1;
  if (/\b(third|3rd|number three|#3)\b/.test(text)) return 2;
  if (/\b(fourth|4th|number four|#4)\b/.test(text)) return 3;
  if (/\b(fifth|5th|number five|#5)\b/.test(text)) return 4;
  if (/\b(sixth|6th|number six|#6)\b/.test(text)) return 5;
  return null;
}

async function clinicChoices(app: Parameters<FastifyPluginAsync>[0]) {
  const departments = await app.prisma.department.findMany({
    select: {
      name: true,
      hospital: { select: { name: true } },
    },
    orderBy: [{ hospital: { name: "asc" } }, { name: "asc" }],
  });
  return departments.map((d) => `${d.name} at ${d.hospital.name}`).join(", ");
}

async function resolveDepartmentFromText(
  app: Parameters<FastifyPluginAsync>[0],
  text: string,
  history: Array<{ role: "user" | "assistant"; text: string }> = [],
) {
  const alias = departmentAlias(text);
  const departments = await app.prisma.department.findMany({
    include: { hospital: true },
    orderBy: [{ hospital: { name: "asc" } }, { name: "asc" }],
  });

  const normalized = normalize(text);
  const direct =
    departments.find((d) => normalize(d.name) === normalize(alias ?? "")) ??
    departments.find((d) => normalized.includes(normalize(d.name))) ??
    departments.find((d) => normalized.includes(normalize(d.hospital.name))) ??
    departments.find((d) => {
      const hospitalWords = normalize(d.hospital.name).split(" ");
      return hospitalWords.length >= 2 && hospitalWords.every((w) => normalized.includes(w));
    });
  if (direct) return direct;

  const recent = history
    .slice(-6)
    .map((m) => m.text)
    .join("\n");
  const recentNormalized = normalize(recent);

  const index = ordinalIndex(normalized);
  if (index !== null) {
    const listed = departments.filter((d) => recentNormalized.includes(normalize(d.hospital.name)));
    if (listed[index]) return listed[index];
  }

  if (/\b(this|that|the one|same one|it)\b/.test(normalized)) {
    for (let i = history.length - 1; i >= 0; i--) {
      const previous = normalize(history[i]!.text);
      const found = departments.find(
        (d) => previous.includes(normalize(d.name)) || previous.includes(normalize(d.hospital.name)),
      );
      if (found) return found;
    }
  }

  return null;
}

export const aiRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [(app as any).authenticate] };

  app.post("/recommend-slots", auth, async (request, reply) => {
    const parsed = recommendSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const from = parsed.data.from ? new Date(parsed.data.from) : new Date();
    const to = parsed.data.to
      ? new Date(parsed.data.to)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const department = await app.prisma.department.findUnique({
      where: { id: parsed.data.departmentId },
    });
    if (!department) {
      return reply.code(404).send({ error: "Department not found" });
    }

    const slots = await app.prisma.timeSlot.findMany({
      where: {
        departmentId: parsed.data.departmentId,
        startsAt: { gte: from, lte: to },
      },
      include: { doctor: { select: { fullName: true } } },
      orderBy: { startsAt: "asc" },
      take: 60,
    });

    const enriched = slots
      .map((slot) => {
        const remaining = Math.max(0, slot.capacity - slot.bookedCount);
        const fillRatio = slot.capacity === 0 ? 1 : slot.bookedCount / slot.capacity;
        const demand = demandLevelForSlot(slot.startsAt, fillRatio);
        return {
          id: slot.id,
          startsAt: slot.startsAt.toISOString(),
          endsAt: slot.endsAt.toISOString(),
          remaining,
          demandLevel: demand.level,
          demandScore: demand.score,
          doctorName: slot.doctor?.fullName ?? null,
        };
      })
      .filter((s) => s.remaining > 0);

    const started = Date.now();
    const ai = await recommendSlots({
      departmentName: department.name,
      preference: parsed.data.preference,
      slots: enriched,
    });

    await app.prisma.aiPromptLog.create({
      data: {
        route: "recommend-slots",
        model: ai.model,
        provider: ai.provider,
        success: ai.ok,
        latencyMs: Date.now() - started,
        error: ai.error ?? null,
      },
    });

    if (!ai.ok) {
      const ranked = rankSlotsByDemand(enriched).slice(0, 5);
      return {
        source: "heuristic",
        summary:
          "AI is temporarily unavailable. Showing quieter slots based on historical demand patterns.",
        recommendations: ranked.map((s, i) => ({
          slotId: s.id,
          rank: i + 1,
          demandLevel: s.demandLevel,
          reason: `${s.demandLevel.toLowerCase()} demand period with ${s.remaining} seat(s) left`,
        })),
        slots: enriched,
      };
    }

    return {
      source: ai.provider,
      summary: ai.summary,
      recommendations: ai.recommendations,
      slots: enriched,
    };
  });

  app.post("/assistant", auth, async (request, reply) => {
    const parsed = chatSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const text = normalize(parsed.data.message);
    const wantsHospitals =
      /\b(hospitals?|clinics?|departments?|available hospitals?|which hospitals?)\b/.test(text);
    const wantsAppointments =
      /\b(my appointments?|next appointment|upcoming|bookings?|visits?)\b/.test(text);
    const wantsAvailability =
      /\b(available|availability|slots?|times?|book|appointment|quiet|busy|free)\b/.test(text);
    const asksRules =
      /\b(same time|same date|duplicate|occupied|already booked|double book|book twice)\b/.test(text);
    const asksCapabilities =
      /\b(what can you do|how can you help|help me|help|assistant)\b/.test(text);
    const isGreeting = /^(hi|hello|hey|yo|good morning|good afternoon|good evening)[!. ]*$/.test(text);

    if (isGreeting) {
      return {
        source: "rules",
        reply:
          "Hey. I can help you find hospitals, check your appointments, and pick quieter booking times. Try “what times are free tomorrow for Cardiology?” or “show my appointments.”",
        toolCalls: [],
      };
    }

    if (asksCapabilities && text.length < 80) {
      return {
        source: "rules",
        reply:
          "I can help with four things: list hospitals and clinics, show your upcoming appointments, find quieter available booking times, and explain booking rules like occupied or duplicate slots. Try asking: “quiet cardiology slots tomorrow” or “what are my appointments?”",
        toolCalls: [],
      };
    }

    if (asksRules) {
      return {
        source: "rules",
        reply:
          "The app now blocks duplicate bookings. One exact time can only be booked by one patient, and the same patient cannot book the same clinic twice on the same date. If a time is occupied, choose another time or cancel the existing appointment first.",
        toolCalls: [],
      };
    }

    const specificDepartment = await resolveDepartmentFromText(app, text, parsed.data.history);
    const broadHospitalQuestion = /\b(which|what|list|all|available)\b.*\b(hospitals?|clinics?|departments?)\b/.test(text);
    if (specificDepartment && wantsHospitals && !broadHospitalQuestion) {
      const openSlots = await app.prisma.timeSlot.findMany({
        where: { departmentId: specificDepartment.id, startsAt: { gte: new Date() } },
        select: { capacity: true, bookedCount: true },
      });
      const open = openSlots.reduce(
        (sum, slot) => sum + Math.max(0, slot.capacity - slot.bookedCount),
        0,
      );
      return {
        source: "rules",
        reply: `${specificDepartment.hospital.name} offers ${specificDepartment.name} in this app. There are ${open} open slot(s). Ask “what days are free for ${specificDepartment.name}?” or “quiet ${specificDepartment.name} slots tomorrow” and I’ll show times.`,
        toolCalls: [],
      };
    }

    if (wantsAppointments && !wantsAvailability) {
      const appointments = await app.prisma.appointment.findMany({
        where: { userId: request.user.sub, status: "BOOKED" },
        include: { department: { include: { hospital: true } }, doctor: true, timeSlot: true },
        orderBy: { timeSlot: { startsAt: "asc" } },
        take: 5,
      });
      if (appointments.length === 0) {
        return {
          source: "rules",
          reply: "You do not have any upcoming booked appointments right now.",
          toolCalls: [],
        };
      }
      return {
        source: "rules",
        reply: `Your upcoming appointments:\n${appointments
          .map(
            (a, i) =>
              `${i + 1}. ${a.department.name} at ${a.department.hospital.name}, ${formatDateTime(
                a.timeSlot.startsAt,
              )}${a.doctor ? ` with ${a.doctor.fullName}` : ""}.`,
          )
          .join("\n")}`,
        toolCalls: [],
      };
    }

    if (wantsHospitals && !parsed.data.departmentId) {
      const departments = await app.prisma.department.findMany({
        select: {
          name: true,
          category: true,
          hours: true,
          hospital: { select: { name: true, city: true } },
          timeSlots: {
            where: { startsAt: { gte: new Date() } },
            select: { capacity: true, bookedCount: true },
          },
        },
        orderBy: [{ hospital: { name: "asc" } }, { name: "asc" }],
      });
      return {
        source: "rules",
        reply: `These are the hospitals/clinics currently available:\n${departments
          .map((d) => {
            const open = d.timeSlots.reduce(
              (sum, slot) => sum + Math.max(0, slot.capacity - slot.bookedCount),
              0,
            );
            return `- ${d.hospital.name} (${d.hospital.city}): ${d.name}, ${open} open slot(s).`;
          })
          .join("\n")}`,
        toolCalls: [],
      };
    }

    if (wantsAvailability && parsed.data.departmentId) {
      const department = await app.prisma.department.findUnique({
        where: { id: parsed.data.departmentId },
        include: { hospital: true },
      });
      if (department) {
        const slots = await app.prisma.timeSlot.findMany({
          where: { departmentId: department.id, startsAt: { gte: new Date() } },
          include: { doctor: true },
          orderBy: { startsAt: "asc" },
          take: 40,
        });
        const open = slots
          .map((slot) => {
            const remaining = Math.max(0, slot.capacity - slot.bookedCount);
            const fillRatio = slot.capacity === 0 ? 1 : slot.bookedCount / slot.capacity;
            const demand = demandLevelForSlot(slot.startsAt, fillRatio);
            return { slot, remaining, demand };
          })
          .filter((s) => s.remaining > 0)
          .sort((a, b) => a.demand.score - b.demand.score)
          .slice(0, 5);
        return {
          source: "rules",
          reply:
            open.length > 0
              ? `Best available ${department.name} times at ${department.hospital.name}:\n${open
                  .map(
                    (s, i) =>
                      `${i + 1}. ${formatDateTime(s.slot.startsAt)}${
                        s.slot.doctor ? ` with ${s.slot.doctor.fullName}` : ""
                      } (${s.demand.level.toLowerCase()} demand).`,
                  )
                  .join("\n")}`
              : `I do not see any open ${department.name} slots right now. Try another clinic or check back later.`,
          toolCalls: [],
        };
      }
    }

    if (wantsAvailability && !parsed.data.departmentId) {
      const department = await resolveDepartmentFromText(app, text, parsed.data.history);

      if (department) {
        const range = requestedDayRange(text);
        const slots = await app.prisma.timeSlot.findMany({
          where: {
            departmentId: department.id,
            startsAt: { gte: range.start, lte: range.end },
          },
          include: { doctor: true },
          orderBy: { startsAt: "asc" },
          take: 60,
        });
        const open = slots
          .map((slot) => {
            const remaining = Math.max(0, slot.capacity - slot.bookedCount);
            const fillRatio = slot.capacity === 0 ? 1 : slot.bookedCount / slot.capacity;
            const demand = demandLevelForSlot(slot.startsAt, fillRatio);
            return { slot, remaining, demand };
          })
          .filter((s) => s.remaining > 0)
          .sort((a, b) => {
            if (/\bquiet|less busy|low demand\b/.test(text)) {
              return a.demand.score - b.demand.score;
            }
            return a.slot.startsAt.getTime() - b.slot.startsAt.getTime();
          })
          .slice(0, 5);
        return {
          source: "rules",
          reply:
            open.length > 0
              ? `Here are ${/\bquiet|less busy|low demand\b/.test(text) ? "quieter" : "available"} ${
                  department.name
                } times at ${department.hospital.name}:\n${open
                  .map(
                    (s, i) =>
                      `${i + 1}. ${formatDateTime(s.slot.startsAt)}${
                        s.slot.doctor ? ` with ${s.slot.doctor.fullName}` : ""
                      } (${s.demand.level.toLowerCase()} demand).`,
                  )
                  .join("\n")}`
              : `I do not see open ${department.name} slots for that date range. Try another day or clinic.`,
          toolCalls: [],
        };
      }

      if (/\bcardio|derm|skin|heart|kidney|pediatric|paediatric|ortho|emergency\b/.test(text)) {
        return {
          source: "rules",
          reply:
            "I could not match that to a clinic confidently. Available clinics are Cardiology, Dermatology, Emergency Medicine, Nephrology & Urology, Orthopedics, and Pediatrics.",
          toolCalls: [],
        };
      }

      return {
        source: "rules",
        reply: `Which clinic should I check? Available options are: ${await clinicChoices(app)}.`,
        toolCalls: [],
      };
    }

    const followUpDepartment = specificDepartment;
    if (followUpDepartment && /\b(days?|when|schedule|this|that|first|second|third|37|military)\b/.test(text)) {
      const range = requestedDayRange(/\bthis week\b/.test(text) ? text : `${text} this week`);
      const slots = await app.prisma.timeSlot.findMany({
        where: {
          departmentId: followUpDepartment.id,
          startsAt: { gte: range.start, lte: range.end },
        },
        orderBy: { startsAt: "asc" },
        take: 80,
      });
      const openByDay = new Map<string, number>();
      for (const slot of slots) {
        const open = Math.max(0, slot.capacity - slot.bookedCount);
        if (open <= 0) continue;
        const key = new Intl.DateTimeFormat("en-GH", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }).format(slot.startsAt);
        openByDay.set(key, (openByDay.get(key) ?? 0) + open);
      }
      return {
        source: "rules",
        reply:
          openByDay.size > 0
            ? `${followUpDepartment.name} at ${followUpDepartment.hospital.name} has open slots on:\n${[
                ...openByDay.entries(),
              ]
                .slice(0, 7)
                .map(([day, count]) => `- ${day}: ${count} open slot(s)`)
                .join("\n")}`
            : `I do not see open ${followUpDepartment.name} slots for that range.`,
        toolCalls: [],
      };
    }

    let departmentName: string | undefined;
    const context: {
      doctors?: Array<{ fullName: string; specialty: string }>;
      upcomingSlots?: Array<{
        startsAt: string;
        remaining: number;
        demandLevel: string;
        doctorName: string | null;
      }>;
      departments?: Array<{ name: string; category: string; hours: string }>;
    } = {};

    if (parsed.data.departmentId) {
      const dept = await app.prisma.department.findUnique({
        where: { id: parsed.data.departmentId },
      });
      departmentName = dept?.name;

      if (dept) {
        const [doctors, slots] = await Promise.all([
          app.prisma.doctor.findMany({
            where: { departmentId: dept.id },
            select: { fullName: true, specialty: true },
            take: 20,
          }),
          app.prisma.timeSlot.findMany({
            where: { departmentId: dept.id, startsAt: { gte: new Date() } },
            include: { doctor: { select: { fullName: true } } },
            orderBy: { startsAt: "asc" },
            take: 20,
          }),
        ]);

        context.doctors = doctors;
        context.upcomingSlots = slots
          .map((slot) => {
            const remaining = Math.max(0, slot.capacity - slot.bookedCount);
            const fillRatio = slot.capacity === 0 ? 1 : slot.bookedCount / slot.capacity;
            const demand = demandLevelForSlot(slot.startsAt, fillRatio);
            return {
              startsAt: slot.startsAt.toISOString(),
              remaining,
              demandLevel: demand.level,
              doctorName: slot.doctor?.fullName ?? null,
            };
          })
          .filter((s) => s.remaining > 0);
      }
    } else {
      const departments = await app.prisma.department.findMany({
      select: {
        name: true,
        category: true,
        hours: true,
        hospital: { select: { name: true, city: true } },
      },
        take: 30,
      });
      context.departments = departments;
    }

    const { sub: userId } = request.user;
    const started = Date.now();
    const result = await chatAssistantAgent({
      message: parsed.data.message,
      departmentName,
      context,
      tools: assistantTools,
      // Bound to this request's authenticated user — the model only ever
      // supplies entity ids, never a userId, and every tool re-checks ownership.
      executeTool: (name, argsJson) => executeTool(name, argsJson, { userId, prisma: app.prisma }),
    });

    await app.prisma.aiPromptLog.create({
      data: {
        route: "assistant",
        model: result.model,
        provider: result.provider,
        success: result.ok,
        latencyMs: Date.now() - started,
        error: result.error ?? null,
      },
    });

    if (!result.ok) {
      app.log.error({ err: result.error, provider: result.provider }, "assistant agent failed");
      return {
        source: "fallback",
        reply:
          "I can help you find quieter appointment times. Open a department, then use “Recommend slots” to see low-demand options. Prefer mid-afternoon mid-week if mornings feel crowded.",
      };
    }

    return {
      source: result.provider,
      reply: result.reply,
      toolCalls: result.toolCalls.map((t) => ({ name: t.name, result: t.result })),
    };
  });

  app.post("/demand-outlook", auth, async (request, reply) => {
    const { role } = request.user;
    if (role !== "STAFF") {
      return reply.code(403).send({ error: "Staff only" });
    }

    const parsed = outlookSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const department = await app.prisma.department.findUnique({
      where: { id: parsed.data.departmentId },
      include: { hospital: true },
    });
    if (!department) {
      return reply.code(404).send({ error: "Department not found" });
    }

    const from = new Date();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const slots = await app.prisma.timeSlot.findMany({
      where: {
        departmentId: department.id,
        startsAt: { gte: from, lte: to },
      },
    });

    const buckets = new Map<string, { booked: number; capacity: number; count: number }>();
    for (const slot of slots) {
      const key = `${slot.startsAt.getDay()}-${slot.startsAt.getHours()}`;
      const cur = buckets.get(key) ?? { booked: 0, capacity: 0, count: 0 };
      cur.booked += slot.bookedCount;
      cur.capacity += slot.capacity;
      cur.count += 1;
      buckets.set(key, cur);
    }

    const periods = [...buckets.entries()].map(([key, v]) => {
      const [weekday, hour] = key.split("-").map(Number);
      const fill = v.capacity ? v.booked / v.capacity : 0;
      const demand = demandLevelForSlot(
        new Date(2026, 0, 4 + weekday, hour),
        fill,
      );
      return {
        weekday,
        hour,
        fillRatio: Number(fill.toFixed(3)),
        level: demand.level,
        score: demand.score,
        slotCount: v.count,
      };
    });

    const started = Date.now();
    const [ai, busy] = await Promise.all([
      demandOutlook({
        departmentName: department.name,
        periods,
      }),
      predictBusyHours({
        departmentName: department.name,
        hospitalName: department.hospital.name,
        periods,
      }),
    ]);

    await app.prisma.aiPromptLog.create({
      data: {
        route: "demand-outlook",
        model: ai.model,
        provider: ai.provider,
        success: ai.ok && busy.ok,
        latencyMs: Date.now() - started,
        error: ai.error ?? busy.error ?? null,
      },
    });

    const high = periods.filter((p) => p.level === "HIGH").length;
    const low = periods.filter((p) => p.level === "LOW").length;
    const predictedBusyHours = busy.ok && busy.busyHours?.length
      ? busy.busyHours
      : [...periods]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
          .map((p) => ({
            weekday: p.weekday,
            hour: p.hour,
            level: p.level as "HIGH" | "MEDIUM" | "LOW",
            confidence: Number(Math.max(0.35, p.score).toFixed(2)),
            reason: `${p.level.toLowerCase()} predicted demand from ${p.slotCount} slot(s) at ${Math.round(p.fillRatio * 100)}% fill.`,
          }));

    return {
      department,
      periods,
      source: ai.ok || busy.ok ? [ai.ok ? ai.provider : null, busy.ok ? busy.provider : null].filter(Boolean).join("+") : "heuristic",
      outlook:
        ai.ok && ai.outlook
          ? ai.outlook
          : `Next 7 days: ${high} high-demand hour buckets and ${low} low-demand buckets. Steer walk-ins toward low-demand windows to balance load.`,
      busyHoursSummary:
        busy.ok && busy.summary
          ? busy.summary
          : `Predicted busiest hours come from the highest current fill ratios and historical demand scores.`,
      busyHours: predictedBusyHours,
    };
  });
};

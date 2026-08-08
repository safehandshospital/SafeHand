import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { recommendSlots, chatAssistant, demandOutlook } from "../services/ai/openai.js";
import { demandLevelForSlot, rankSlotsByDemand } from "../services/demand.js";

const recommendSchema = z.object({
  departmentId: z.string().min(1),
  preference: z.string().max(500).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  departmentId: z.string().optional(),
});

const outlookSchema = z.object({
  departmentId: z.string().min(1),
});

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
      source: "openai",
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

    let departmentName: string | undefined;
    if (parsed.data.departmentId) {
      const dept = await app.prisma.department.findUnique({
        where: { id: parsed.data.departmentId },
      });
      departmentName = dept?.name;
    }

    const started = Date.now();
    const result = await chatAssistant({
      message: parsed.data.message,
      departmentName,
    });

    await app.prisma.aiPromptLog.create({
      data: {
        route: "assistant",
        model: result.model,
        success: result.ok,
        latencyMs: Date.now() - started,
        error: result.error ?? null,
      },
    });

    if (!result.ok) {
      return {
        source: "fallback",
        reply:
          "I can help you find quieter appointment times. Open a department, then use “Recommend slots” to see low-demand options. Prefer mid-afternoon mid-week if mornings feel crowded.",
      };
    }

    return { source: "openai", reply: result.reply };
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
      };
    });

    const started = Date.now();
    const ai = await demandOutlook({
      departmentName: department.name,
      periods,
    });

    await app.prisma.aiPromptLog.create({
      data: {
        route: "demand-outlook",
        model: ai.model,
        success: ai.ok,
        latencyMs: Date.now() - started,
        error: ai.error ?? null,
      },
    });

    const high = periods.filter((p) => p.level === "HIGH").length;
    const low = periods.filter((p) => p.level === "LOW").length;

    return {
      department,
      periods,
      source: ai.ok ? "openai" : "heuristic",
      outlook:
        ai.ok && ai.outlook
          ? ai.outlook
          : `Next 7 days: ${high} high-demand hour buckets and ${low} low-demand buckets. Steer walk-ins toward low-demand windows to balance load.`,
    };
  });
};

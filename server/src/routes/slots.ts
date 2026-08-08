import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { demandLevelForSlot } from "../services/demand.js";

const querySchema = z.object({
  departmentId: z.string().min(1),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const slotRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const from = parsed.data.from
      ? new Date(parsed.data.from)
      : new Date();
    const to = parsed.data.to
      ? new Date(parsed.data.to)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const slots = await app.prisma.timeSlot.findMany({
      where: {
        departmentId: parsed.data.departmentId,
        startsAt: { gte: from, lte: to },
      },
      include: {
        doctor: { select: { id: true, fullName: true, specialty: true, avatarUrl: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    const enriched = slots.map((slot) => {
      const remaining = Math.max(0, slot.capacity - slot.bookedCount);
      const fillRatio = slot.capacity === 0 ? 1 : slot.bookedCount / slot.capacity;
      const demand = demandLevelForSlot(slot.startsAt, fillRatio);
      return {
        ...slot,
        remaining,
        available: remaining > 0,
        demandLevel: demand.level,
        demandScore: demand.score,
      };
    });

    return { slots: enriched };
  });
};

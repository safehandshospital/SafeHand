import type { FastifyPluginAsync } from "fastify";

export const metricsRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [(app as any).authenticate] };

  app.get("/evaluation", auth, async (request, reply) => {
    const { role } = request.user;
    if (role !== "STAFF") {
      return reply.code(403).send({ error: "Staff only" });
    }

    const [booked, cancelled, aiRecommended, slots, aiLogs] = await Promise.all([
      app.prisma.appointment.count({ where: { status: "BOOKED" } }),
      app.prisma.appointment.count({ where: { status: "CANCELLED" } }),
      app.prisma.appointment.count({ where: { aiRecommended: true } }),
      app.prisma.timeSlot.findMany({
        select: { bookedCount: true, capacity: true, startsAt: true },
      }),
      app.prisma.aiPromptLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const totalCapacity = slots.reduce((s, x) => s + x.capacity, 0);
    const totalBooked = slots.reduce((s, x) => s + x.bookedCount, 0);
    const fillRatio = totalCapacity ? totalBooked / totalCapacity : 0;

    // Slot distribution balance: stddev of fill ratios across hour buckets
    const hourFills = new Map<number, number[]>();
    for (const slot of slots) {
      const h = slot.startsAt.getHours();
      const fill = slot.capacity ? slot.bookedCount / slot.capacity : 0;
      const arr = hourFills.get(h) ?? [];
      arr.push(fill);
      hourFills.set(h, arr);
    }
    const means = [...hourFills.values()].map(
      (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
    );
    const mean = means.length ? means.reduce((a, b) => a + b, 0) / means.length : 0;
    const variance =
      means.length > 0
        ? means.reduce((s, m) => s + (m - mean) ** 2, 0) / means.length
        : 0;

    const aiSuccess = aiLogs.filter((l) => l.success).length;
    const aiTotal = aiLogs.length;

    return {
      metrics: {
        bookingCompletionActive: booked,
        cancellations: cancelled,
        aiRecommendationAcceptance: aiRecommended,
        slotFillRatio: Number(fillRatio.toFixed(3)),
        slotDistributionVariance: Number(variance.toFixed(4)),
        aiCallSuccessRate: aiTotal ? Number((aiSuccess / aiTotal).toFixed(3)) : null,
        notes: {
          maeR2:
            "Reserved for Phase 6 Random Forest evaluation on historical demand forecasts.",
        },
      },
      recentAiLogs: aiLogs.slice(0, 10),
    };
  });
};

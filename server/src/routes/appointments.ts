import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { buildAppointmentTitle } from "../lib/appointmentTitle.js";

const bookSchema = z.object({
  timeSlotId: z.string().min(1),
  topic: z.string().min(2).max(120).optional(),
  purpose: z.string().min(2).max(500).optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(500).optional(),
  aiRecommended: z.boolean().optional(),
});

const customBookSchema = z.object({
  departmentId: z.string().min(1),
  startsAt: z.string().datetime(),
  topic: z.string().min(2).max(120).optional(),
  purpose: z.string().min(2).max(500).optional(),
  description: z.string().max(2000).optional(),
  notes: z.string().max(500).optional(),
});

const rescheduleSchema = z.object({
  newTimeSlotId: z.string().min(1),
});

const CUSTOM_BOOKING_DAYS_AHEAD = 14;
const CUSTOM_BOOKING_HOURS = new Set([8, 9, 10, 11, 13, 14, 15, 16]);

function isUniqueOrOverbookError(err: unknown) {
  return (
    (err instanceof Error && err.message === "OVERBOOK") ||
    (typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002")
  );
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date) {
  const copy = startOfDay(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function patientClinicDayLockKey(userId: string, departmentId: string, startsAt: Date) {
  return `${userId}:${departmentId}:${startOfDay(startsAt).toISOString()}`;
}

function duplicateClinicDayMessage(departmentName: string) {
  return `You already have a booked ${departmentName} appointment on this date. Please cancel it first or choose another date.`;
}

function validateCustomStartsAt(startsAt: Date): string | null {
  const now = new Date();
  if (startsAt.getTime() <= now.getTime()) {
    return "Choose a future date and time";
  }

  const latest = startOfDay(now);
  latest.setDate(latest.getDate() + CUSTOM_BOOKING_DAYS_AHEAD);
  latest.setHours(23, 59, 59, 999);
  if (startsAt.getTime() > latest.getTime()) {
    return "Choose a date within the next 14 days";
  }

  if (startsAt.getDay() === 0) {
    return "This clinic is closed on Sundays. Choose Monday to Saturday.";
  }

  if (startsAt.getMinutes() !== 0 || startsAt.getSeconds() !== 0) {
    return "Choose one of the listed appointment times.";
  }

  if (!CUSTOM_BOOKING_HOURS.has(startsAt.getHours())) {
    return "Choose a time during hospital booking hours: 8:00 AM to 4:30 PM.";
  }

  return null;
}

export const appointmentRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [(app as any).authenticate] };

  app.get("/", auth, async (request) => {
    const { sub, role } = request.user;
    const appointments = await app.prisma.appointment.findMany({
      where: role === "STAFF" ? undefined : { userId: sub },
      include: {
        department: { include: { hospital: true } },
        doctor: true,
        timeSlot: true,
        healthFiles: { orderBy: { createdAt: "asc" } },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return { appointments };
  });

  app.post("/", auth, async (request, reply) => {
    const parsed = bookSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const { sub } = request.user;
    const slot = await app.prisma.timeSlot.findUnique({
      where: { id: parsed.data.timeSlotId },
      include: {
        doctor: true,
        department: true,
      },
    });
    if (!slot) {
      return reply.code(404).send({ error: "Time slot not found" });
    }
    if (slot.bookedCount >= 1 || slot.capacity < 1) {
      return reply.code(409).send({ error: "Time slot is full" });
    }

    const existing = await app.prisma.appointment.findFirst({
      where: {
        userId: sub,
        timeSlotId: slot.id,
        status: "BOOKED",
      },
    });
    if (existing) {
      return reply.code(409).send({ error: "Slot already booked" });
    }

    const topic =
      parsed.data.topic?.trim() ||
      `${slot.department.name} consultation`;
    const purpose =
      parsed.data.purpose?.trim() ||
      `Discuss this ${slot.department.name.toLowerCase()} visit.`;
    const title = buildAppointmentTitle({
      topic,
      departmentName: slot.department.name,
      doctorName: slot.doctor?.fullName,
    });

    const appointment = await app.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${patientClinicDayLockKey(
        sub,
        slot.departmentId,
        slot.startsAt,
      )}))`;

      const duplicateDay = await tx.appointment.findFirst({
        where: {
          userId: sub,
          departmentId: slot.departmentId,
          status: "BOOKED",
          timeSlot: {
            startsAt: {
              gte: startOfDay(slot.startsAt),
              lte: endOfDay(slot.startsAt),
            },
          },
        },
        select: { id: true },
      });
      if (duplicateDay) {
        throw new Error("DUPLICATE_CLINIC_DAY");
      }

      const claimed = await tx.timeSlot.updateMany({
        where: {
          id: slot.id,
          bookedCount: { lt: 1 },
          capacity: { gt: 0 },
        },
        data: {
          bookedCount: 1,
          capacity: 1,
        },
      });
      if (claimed.count !== 1) {
        throw new Error("OVERBOOK");
      }

      return tx.appointment.create({
        data: {
          userId: sub,
          departmentId: slot.departmentId,
          doctorId: slot.doctorId,
          timeSlotId: slot.id,
          title,
          topic,
          purpose,
          description: parsed.data.description?.trim() || null,
          notes: parsed.data.notes,
          aiRecommended: parsed.data.aiRecommended ?? false,
          status: "BOOKED",
        },
        include: {
          department: { include: { hospital: true } },
          doctor: true,
          timeSlot: true,
          healthFiles: true,
        },
      });
    }).catch(async (err) => {
      if (err instanceof Error && err.message === "DUPLICATE_CLINIC_DAY") {
        return "DUPLICATE_CLINIC_DAY" as const;
      }
      if (isUniqueOrOverbookError(err)) {
        return null;
      }
      throw err;
    });

    if (appointment === "DUPLICATE_CLINIC_DAY") {
      return reply
        .code(409)
        .send({ error: duplicateClinicDayMessage(slot.department.name) });
    }

    if (!appointment) {
      return reply.code(409).send({ error: "Only one patient can book that time. Please choose another slot." });
    }

    await app.prisma.auditLog.create({
      data: {
        userId: sub,
        action: "BOOK",
        entity: "Appointment",
        entityId: appointment.id,
      },
    });

    return { appointment };
  });

  app.post("/custom", auth, async (request, reply) => {
    const parsed = customBookSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const { sub } = request.user;
    const startsAt = new Date(parsed.data.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      return reply.code(400).send({ error: "Invalid appointment date/time" });
    }
    const validationError = validateCustomStartsAt(startsAt);
    if (validationError) {
      return reply.code(400).send({ error: validationError });
    }

    const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
    const department = await app.prisma.department.findUnique({
      where: { id: parsed.data.departmentId },
      include: {
        doctors: { orderBy: { fullName: "asc" }, take: 1 },
      },
    });
    if (!department) {
      return reply.code(404).send({ error: "Department not found" });
    }

    const doctor = department.doctors[0] ?? null;
    const topic =
      parsed.data.topic?.trim() ||
      `${department.name} consultation`;
    const purpose =
      parsed.data.purpose?.trim() ||
      `Discuss this ${department.name.toLowerCase()} visit.`;
    const title = buildAppointmentTitle({
      topic,
      departmentName: department.name,
      doctorName: doctor?.fullName,
    });

    const appointment = await app.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${patientClinicDayLockKey(
        sub,
        department.id,
        startsAt,
      )}))`;

      const duplicateDay = await tx.appointment.findFirst({
        where: {
          userId: sub,
          departmentId: department.id,
          status: "BOOKED",
          timeSlot: {
            startsAt: {
              gte: startOfDay(startsAt),
              lte: endOfDay(startsAt),
            },
          },
        },
        select: { id: true },
      });
      if (duplicateDay) {
        throw new Error("DUPLICATE_CLINIC_DAY");
      }

      const slot = await tx.timeSlot.upsert({
        where: {
          departmentId_startsAt: {
            departmentId: department.id,
            startsAt,
          },
        },
        update: {},
        create: {
          departmentId: department.id,
          doctorId: doctor?.id,
          startsAt,
          endsAt,
          capacity: 1,
          bookedCount: 0,
        },
      });

      const claimed = await tx.timeSlot.updateMany({
        where: {
          id: slot.id,
          bookedCount: { lt: 1 },
          capacity: { gt: 0 },
        },
        data: {
          bookedCount: 1,
          capacity: 1,
          endsAt,
          doctorId: slot.doctorId ?? doctor?.id,
        },
      });
      if (claimed.count !== 1) {
        throw new Error("OVERBOOK");
      }

      return tx.appointment.create({
        data: {
          userId: sub,
          departmentId: department.id,
          doctorId: slot.doctorId ?? doctor?.id,
          timeSlotId: slot.id,
          title,
          topic,
          purpose,
          description: parsed.data.description?.trim() || null,
          notes: parsed.data.notes,
          aiRecommended: false,
          status: "BOOKED",
        },
        include: {
          department: { include: { hospital: true } },
          doctor: true,
          timeSlot: true,
          healthFiles: true,
        },
      });
    }).catch((err) => {
      if (err instanceof Error && err.message === "DUPLICATE_CLINIC_DAY") {
        return "DUPLICATE_CLINIC_DAY" as const;
      }
      if (isUniqueOrOverbookError(err)) return null;
      throw err;
    });

    if (appointment === "DUPLICATE_CLINIC_DAY") {
      return reply
        .code(409)
        .send({ error: duplicateClinicDayMessage(department.name) });
    }

    if (!appointment) {
      return reply
        .code(409)
        .send({ error: "That date and time is already occupied. Please choose another time." });
    }

    await app.prisma.auditLog.create({
      data: {
        userId: sub,
        action: "BOOK_CUSTOM",
        entity: "Appointment",
        entityId: appointment.id,
        meta: { startsAt: startsAt.toISOString() },
      },
    });

    return { appointment };
  });

  app.post("/:id/cancel", auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub, role } = request.user;

    const appointment = await app.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) {
      return reply.code(404).send({ error: "Appointment not found" });
    }
    if (role !== "STAFF" && appointment.userId !== sub) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    if (appointment.status !== "BOOKED") {
      return reply.code(400).send({ error: "Appointment is not active" });
    }

    const cancelled = await app.prisma.$transaction(async (tx) => {
      await tx.timeSlot.update({
        where: { id: appointment.timeSlotId },
        data: { bookedCount: 0, capacity: 1 },
      });
      return tx.appointment.update({
        where: { id },
        data: { status: "CANCELLED" },
        include: { department: true, timeSlot: true, doctor: true },
      });
    });

    await app.prisma.auditLog.create({
      data: {
        userId: sub,
        action: "CANCEL",
        entity: "Appointment",
        entityId: id,
      },
    });

    return { appointment: cancelled };
  });

  app.post("/:id/reschedule", auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { sub, role } = request.user;
    const parsed = rescheduleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const appointment = await app.prisma.appointment.findUnique({
      where: { id },
    });
    if (!appointment) {
      return reply.code(404).send({ error: "Appointment not found" });
    }
    if (role !== "STAFF" && appointment.userId !== sub) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    if (appointment.status !== "BOOKED") {
      return reply.code(400).send({ error: "Appointment is not active" });
    }

    const newSlot = await app.prisma.timeSlot.findUnique({
      where: { id: parsed.data.newTimeSlotId },
      include: { department: true },
    });
    if (!newSlot) {
      return reply.code(404).send({ error: "New time slot not found" });
    }
    if (newSlot.bookedCount >= 1 || newSlot.capacity < 1) {
      return reply.code(409).send({ error: "New time slot is full" });
    }

    const updated = await app.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${patientClinicDayLockKey(
        appointment.userId,
        newSlot.departmentId,
        newSlot.startsAt,
      )}))`;

      const duplicateDay = await tx.appointment.findFirst({
        where: {
          id: { not: appointment.id },
          userId: appointment.userId,
          departmentId: newSlot.departmentId,
          status: "BOOKED",
          timeSlot: {
            startsAt: {
              gte: startOfDay(newSlot.startsAt),
              lte: endOfDay(newSlot.startsAt),
            },
          },
        },
        select: { id: true },
      });
      if (duplicateDay) {
        throw new Error("DUPLICATE_CLINIC_DAY");
      }

      const claimed = await tx.timeSlot.updateMany({
        where: {
          id: newSlot.id,
          bookedCount: { lt: 1 },
          capacity: { gt: 0 },
        },
        data: {
          bookedCount: 1,
          capacity: 1,
        },
      });
      if (claimed.count !== 1) {
        throw new Error("OVERBOOK");
      }
      await tx.timeSlot.update({
        where: { id: appointment.timeSlotId },
        data: { bookedCount: 0, capacity: 1 },
      });
      return tx.appointment.update({
        where: { id },
        data: {
          timeSlotId: newSlot.id,
          departmentId: newSlot.departmentId,
          doctorId: newSlot.doctorId,
          status: "BOOKED",
        },
        include: { department: true, timeSlot: true, doctor: true },
      });
    }).catch((err) => {
      if (err instanceof Error && err.message === "DUPLICATE_CLINIC_DAY") {
        return "DUPLICATE_CLINIC_DAY" as const;
      }
      if (isUniqueOrOverbookError(err)) return null;
      throw err;
    });

    if (updated === "DUPLICATE_CLINIC_DAY") {
      return reply
        .code(409)
        .send({ error: duplicateClinicDayMessage(newSlot.department.name) });
    }

    if (!updated) {
      return reply.code(409).send({ error: "New time slot is full" });
    }

    await app.prisma.auditLog.create({
      data: {
        userId: sub,
        action: "RESCHEDULE",
        entity: "Appointment",
        entityId: id,
        meta: { from: appointment.timeSlotId, to: newSlot.id },
      },
    });

    return { appointment: updated };
  });
};

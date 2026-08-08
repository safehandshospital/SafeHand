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

const rescheduleSchema = z.object({
  newTimeSlotId: z.string().min(1),
});

export const appointmentRoutes: FastifyPluginAsync = async (app) => {
  const auth = { preHandler: [(app as any).authenticate] };

  app.get("/", auth, async (request) => {
    const { sub, role } = request.user;
    const appointments = await app.prisma.appointment.findMany({
      where: role === "STAFF" ? undefined : { userId: sub },
      include: {
        department: true,
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
    if (slot.bookedCount >= slot.capacity) {
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
      const updated = await tx.timeSlot.update({
        where: { id: slot.id },
        data: { bookedCount: { increment: 1 } },
      });
      if (updated.bookedCount > updated.capacity) {
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
          department: true,
          doctor: true,
          timeSlot: true,
          healthFiles: true,
        },
      });
    }).catch(async (err) => {
      if (err instanceof Error && err.message === "OVERBOOK") {
        return null;
      }
      throw err;
    });

    if (!appointment) {
      return reply.code(409).send({ error: "Time slot is full" });
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
        data: { bookedCount: { decrement: 1 } },
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
    });
    if (!newSlot) {
      return reply.code(404).send({ error: "New time slot not found" });
    }
    if (newSlot.bookedCount >= newSlot.capacity) {
      return reply.code(409).send({ error: "New time slot is full" });
    }

    const updated = await app.prisma.$transaction(async (tx) => {
      await tx.timeSlot.update({
        where: { id: appointment.timeSlotId },
        data: { bookedCount: { decrement: 1 } },
      });
      const bumped = await tx.timeSlot.update({
        where: { id: newSlot.id },
        data: { bookedCount: { increment: 1 } },
      });
      if (bumped.bookedCount > bumped.capacity) {
        throw new Error("OVERBOOK");
      }
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
      if (err instanceof Error && err.message === "OVERBOOK") return null;
      throw err;
    });

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

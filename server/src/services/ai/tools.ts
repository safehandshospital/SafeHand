import type { PrismaClient } from "@prisma/client";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { demandLevelForSlot } from "../demand.js";
import { buildAppointmentTitle } from "../../lib/appointmentTitle.js";

/**
 * Every tool runs against a fixed userId taken from the caller's verified JWT
 * (see routes/ai.ts) — the model can never pass or override whose data it acts on.
 * Booking/cancel/reschedule reuse the same ownership checks as the REST routes.
 */
export type ToolContext = {
  userId: string;
  prisma: PrismaClient;
};

export const assistantTools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_departments",
      description: "List all clinic departments with hours, category, and location.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "list_available_slots",
      description:
        "List open (bookable) appointment time slots for a department, ordered soonest first.",
      parameters: {
        type: "object",
        properties: {
          departmentName: {
            type: "string",
            description: "Exact department name, e.g. 'Cardiology'.",
          },
          hospitalName: {
            type: "string",
            description: "Optional exact hospital name when multiple hospitals have the same department.",
          },
          limit: {
            type: "integer",
            description: "Max slots to return (default 10, max 30).",
          },
        },
        required: ["departmentName"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_my_appointments",
      description:
        "List the current signed-in patient's own appointments (never anyone else's).",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["BOOKED", "CANCELLED", "COMPLETED", "RESCHEDULED", "ANY"],
            description: "Filter by status. Defaults to BOOKED (upcoming/active).",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description:
        "Book the current signed-in patient into an open time slot. Always confirm department, doctor, and time with the patient before calling this.",
      parameters: {
        type: "object",
        properties: {
          timeSlotId: { type: "string", description: "The id of the time slot to book." },
          topic: { type: "string", description: "Short visit topic, e.g. 'Follow up'." },
          notes: { type: "string", description: "Any patient notes for the visit." },
        },
        required: ["timeSlotId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancel_appointment",
      description: "Cancel one of the current signed-in patient's own booked appointments.",
      parameters: {
        type: "object",
        properties: {
          appointmentId: { type: "string", description: "Id of the appointment to cancel." },
        },
        required: ["appointmentId"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reschedule_appointment",
      description:
        "Move one of the current signed-in patient's own booked appointments to a different open time slot.",
      parameters: {
        type: "object",
        properties: {
          appointmentId: { type: "string", description: "Id of the appointment to move." },
          newTimeSlotId: { type: "string", description: "Id of the new time slot." },
        },
        required: ["appointmentId", "newTimeSlotId"],
        additionalProperties: false,
      },
    },
  },
];

function enrichSlot(slot: {
  id: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  bookedCount: number;
  doctor: { fullName: string } | null;
}) {
  const remaining = Math.max(0, slot.capacity - slot.bookedCount);
  const fillRatio = slot.capacity === 0 ? 1 : slot.bookedCount / slot.capacity;
  const demand = demandLevelForSlot(slot.startsAt, fillRatio);
  return {
    id: slot.id,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    remaining,
    demandLevel: demand.level,
    doctorName: slot.doctor?.fullName ?? null,
  };
}

export async function executeTool(
  name: string,
  rawArgs: string,
  ctx: ToolContext,
): Promise<{ result: unknown; sideEffect: boolean }> {
  let args: Record<string, unknown>;
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    return { result: { error: "Could not parse tool arguments" }, sideEffect: false };
  }

  switch (name) {
    case "list_departments": {
      const departments = await ctx.prisma.department.findMany({
        select: {
          id: true,
          name: true,
          category: true,
          hours: true,
          location: true,
          hospital: { select: { name: true, city: true } },
        },
        orderBy: [{ hospital: { name: "asc" } }, { name: "asc" }],
      });
      return { result: { departments }, sideEffect: false };
    }

    case "list_available_slots": {
      const departmentName = String(args.departmentName ?? "");
      const hospitalName =
        typeof args.hospitalName === "string" && args.hospitalName.trim()
          ? args.hospitalName.trim()
          : undefined;
      const limit = Math.min(30, Math.max(1, Number(args.limit) || 10));
      const departments = await ctx.prisma.department.findMany({
        where: {
          name: departmentName,
          ...(hospitalName ? { hospital: { name: hospitalName } } : {}),
        },
        include: { hospital: true },
        orderBy: [{ hospital: { name: "asc" } }, { name: "asc" }],
        take: 2,
      });
      const department = departments[0];
      if (!department) {
        return { result: { error: `No department named "${departmentName}"` }, sideEffect: false };
      }
      if (departments.length > 1) {
        return {
          result: {
            error: `More than one hospital has "${departmentName}". Ask which hospital first.`,
            matches: departments.map((d) => ({ departmentId: d.id, hospital: d.hospital.name })),
          },
          sideEffect: false,
        };
      }
      const slots = await ctx.prisma.timeSlot.findMany({
        where: { departmentId: department.id, startsAt: { gte: new Date() } },
        include: { doctor: { select: { fullName: true } } },
        orderBy: { startsAt: "asc" },
        take: limit * 3,
      });
      const open = slots.map(enrichSlot).filter((s) => s.remaining > 0).slice(0, limit);
      return {
        result: {
          departmentId: department.id,
          hospital: department.hospital.name,
          slots: open,
        },
        sideEffect: false,
      };
    }

    case "list_my_appointments": {
      const status = typeof args.status === "string" ? args.status : "BOOKED";
      const appointments = await ctx.prisma.appointment.findMany({
        where: {
          userId: ctx.userId,
          ...(status !== "ANY" ? { status: status as any } : {}),
        },
        include: { department: true, doctor: true, timeSlot: true },
        orderBy: { createdAt: "desc" },
        take: 25,
      });
      return {
        result: {
          appointments: appointments.map((a) => ({
            id: a.id,
            status: a.status,
            title: a.title,
            department: a.department.name,
            doctorName: a.doctor?.fullName ?? null,
            startsAt: a.timeSlot.startsAt.toISOString(),
          })),
        },
        sideEffect: false,
      };
    }

    case "book_appointment": {
      const timeSlotId = String(args.timeSlotId ?? "");
      const slot = await ctx.prisma.timeSlot.findUnique({
        where: { id: timeSlotId },
        include: { doctor: true, department: true },
      });
      if (!slot) return { result: { error: "Time slot not found" }, sideEffect: false };
      if (slot.bookedCount >= 1 || slot.capacity < 1) {
        return { result: { error: "That time slot is already full" }, sideEffect: false };
      }
      const existing = await ctx.prisma.appointment.findFirst({
        where: { userId: ctx.userId, timeSlotId: slot.id, status: "BOOKED" },
      });
      if (existing) {
        return { result: { error: "You already have this slot booked", appointmentId: existing.id }, sideEffect: false };
      }

      const topic = typeof args.topic === "string" && args.topic.trim()
        ? args.topic.trim()
        : `${slot.department.name} consultation`;
      const title = buildAppointmentTitle({
        topic,
        departmentName: slot.department.name,
        doctorName: slot.doctor?.fullName,
      });

      const appointment = await ctx.prisma
        .$transaction(async (tx) => {
          const claimed = await tx.timeSlot.updateMany({
            where: {
              id: slot.id,
              bookedCount: { lt: 1 },
              capacity: { gt: 0 },
            },
            data: { bookedCount: 1, capacity: 1 },
          });
          if (claimed.count !== 1) throw new Error("OVERBOOK");
          return tx.appointment.create({
            data: {
              userId: ctx.userId,
              departmentId: slot.departmentId,
              doctorId: slot.doctorId,
              timeSlotId: slot.id,
              title,
              topic,
              purpose: `Discuss this ${slot.department.name.toLowerCase()} visit.`,
              notes: typeof args.notes === "string" ? args.notes : undefined,
              aiRecommended: true,
              status: "BOOKED",
            },
            include: { department: true, doctor: true, timeSlot: true },
          });
        }, { timeout: 10000 })
        .catch((err) => {
          if (
            (err instanceof Error && err.message === "OVERBOOK") ||
            (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002")
          ) return null;
          throw err;
        });

      if (!appointment) {
        return { result: { error: "Only one patient can book that time. Please choose another slot." }, sideEffect: false };
      }

      await ctx.prisma.auditLog.create({
        data: { userId: ctx.userId, action: "BOOK", entity: "Appointment", entityId: appointment.id },
      });

      return {
        result: {
          booked: true,
          appointmentId: appointment.id,
          title: appointment.title,
          startsAt: appointment.timeSlot.startsAt.toISOString(),
        },
        sideEffect: true,
      };
    }

    case "cancel_appointment": {
      const appointmentId = String(args.appointmentId ?? "");
      const appointment = await ctx.prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appointment) return { result: { error: "Appointment not found" }, sideEffect: false };
      if (appointment.userId !== ctx.userId) {
        return { result: { error: "You can only cancel your own appointments" }, sideEffect: false };
      }
      if (appointment.status !== "BOOKED") {
        return { result: { error: "Appointment is not active" }, sideEffect: false };
      }

      await ctx.prisma.$transaction(async (tx) => {
        await tx.timeSlot.update({
          where: { id: appointment.timeSlotId },
          data: { bookedCount: 0, capacity: 1 },
        });
        await tx.appointment.update({ where: { id: appointmentId }, data: { status: "CANCELLED" } });
      }, { timeout: 10000 });

      await ctx.prisma.auditLog.create({
        data: { userId: ctx.userId, action: "CANCEL", entity: "Appointment", entityId: appointmentId },
      });

      return { result: { cancelled: true, appointmentId }, sideEffect: true };
    }

    case "reschedule_appointment": {
      const appointmentId = String(args.appointmentId ?? "");
      const newTimeSlotId = String(args.newTimeSlotId ?? "");
      const appointment = await ctx.prisma.appointment.findUnique({ where: { id: appointmentId } });
      if (!appointment) return { result: { error: "Appointment not found" }, sideEffect: false };
      if (appointment.userId !== ctx.userId) {
        return { result: { error: "You can only reschedule your own appointments" }, sideEffect: false };
      }
      if (appointment.status !== "BOOKED") {
        return { result: { error: "Appointment is not active" }, sideEffect: false };
      }
      const newSlot = await ctx.prisma.timeSlot.findUnique({ where: { id: newTimeSlotId } });
      if (!newSlot) return { result: { error: "New time slot not found" }, sideEffect: false };
      if (newSlot.bookedCount >= 1 || newSlot.capacity < 1) {
        return { result: { error: "New time slot is already full" }, sideEffect: false };
      }

      const updated = await ctx.prisma
        .$transaction(async (tx) => {
          const claimed = await tx.timeSlot.updateMany({
            where: {
              id: newSlot.id,
              bookedCount: { lt: 1 },
              capacity: { gt: 0 },
            },
            data: { bookedCount: 1, capacity: 1 },
          });
          if (claimed.count !== 1) throw new Error("OVERBOOK");
          await tx.timeSlot.update({
            where: { id: appointment.timeSlotId },
            data: { bookedCount: 0, capacity: 1 },
          });
          return tx.appointment.update({
            where: { id: appointmentId },
            data: {
              timeSlotId: newSlot.id,
              departmentId: newSlot.departmentId,
              doctorId: newSlot.doctorId,
              status: "BOOKED",
            },
            include: { department: true, timeSlot: true },
          });
        }, { timeout: 10000 })
        .catch((err) => {
          if (
            (err instanceof Error && err.message === "OVERBOOK") ||
            (typeof err === "object" && err !== null && "code" in err && (err as { code?: string }).code === "P2002")
          ) return null;
          throw err;
        });

      if (!updated) {
        return { result: { error: "New time slot filled up just now" }, sideEffect: false };
      }

      await ctx.prisma.auditLog.create({
        data: { userId: ctx.userId, action: "RESCHEDULE", entity: "Appointment", entityId: appointmentId },
      });

      return {
        result: {
          rescheduled: true,
          appointmentId,
          startsAt: updated.timeSlot.startsAt.toISOString(),
        },
        sideEffect: true,
      };
    }

    default:
      return { result: { error: `Unknown tool "${name}"` }, sideEffect: false };
  }
}

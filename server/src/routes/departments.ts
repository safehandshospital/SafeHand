import type { FastifyPluginAsync } from "fastify";

function patientInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P.";
  if (parts.length === 1) return `${parts[0][0]?.toUpperCase() ?? "P"}.`;
  return `${parts[0][0]!.toUpperCase()}. ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

/** Short visit label for public clinic rail. No clinical detail. */
function safeVisitLabel(topic: string | null | undefined, deptName: string): string {
  const raw = topic?.trim();
  if (!raw) return `${deptName} visit`;
  if (raw.length > 42) return `${raw.slice(0, 40)}…`;
  return raw;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  return [];
}

export const departmentRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async () => {
    const now = new Date();
    const departments = await app.prisma.department.findMany({
      orderBy: { name: "asc" },
      include: {
        hospital: true,
        doctors: {
          select: {
            id: true,
            fullName: true,
            specialty: true,
            avatarUrl: true,
          },
          take: 3,
          orderBy: { fullName: "asc" },
        },
        _count: {
          select: { timeSlots: true, doctors: true, appointments: true },
        },
        timeSlots: {
          where: {
            startsAt: { gte: now },
          },
          select: { id: true, capacity: true, bookedCount: true },
        },
        appointments: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            topic: true,
            createdAt: true,
            timeSlot: { select: { startsAt: true } },
            user: { select: { fullName: true } },
          },
        },
      },
    });

    const patientGroups = await app.prisma.appointment.groupBy({
      by: ["departmentId", "userId"],
      where: {
        status: { in: ["BOOKED", "COMPLETED", "RESCHEDULED"] },
      },
    });

    const patientsByDept = new Map<string, number>();
    for (const row of patientGroups) {
      patientsByDept.set(
        row.departmentId,
        (patientsByDept.get(row.departmentId) ?? 0) + 1,
      );
    }

    return {
      departments: departments.map((dept) => {
        const { timeSlots, appointments, services, ...rest } = dept;
        const openSlots = timeSlots.reduce(
          (sum, slot) => sum + Math.max(0, slot.capacity - slot.bookedCount),
          0,
        );
        const upcomingSlots = timeSlots.length;
        return {
          ...rest,
          hospital: dept.hospital,
          services: asStringArray(services),
          openSlots,
          upcomingSlots,
          totalPatients: patientsByDept.get(dept.id) ?? 0,
          recentAppointments: appointments.map((a) => ({
            id: a.id,
            status: a.status,
            startsAt: a.timeSlot.startsAt,
            patientLabel: patientInitials(a.user.fullName),
            visitLabel: safeVisitLabel(a.topic, dept.name),
          })),
        };
      }),
    };
  });

  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const department = await app.prisma.department.findUnique({
      where: { id },
      include: {
        hospital: true,
        doctors: {
          select: {
            id: true,
            fullName: true,
            specialty: true,
            avatarUrl: true,
          },
        },
      },
    });
    if (!department) {
      return reply.code(404).send({ error: "Department not found" });
    }
    return {
      department: {
        ...department,
        services: asStringArray(department.services),
      },
    };
  });
};

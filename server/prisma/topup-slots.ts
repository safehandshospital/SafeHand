import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DAYS_AHEAD = Number(process.env.TOPUP_DAYS) || 14;
const HOURS = [8, 9, 10, 11, 13, 14, 15, 16];

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function atHour(day: Date, hour: number, minute = 0) {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  const now = new Date();
  const horizon = addDays(now, DAYS_AHEAD);

  const departments = await prisma.department.findMany({
    include: { doctors: true },
  });

  if (departments.length === 0) {
    console.log("No departments found — run the full seed first (npm run db:seed).");
    return;
  }

  let created = 0;

  for (const department of departments) {
    // Existing seed data assigns one doctor per department; fall back to
    // doctorless slots if a department somehow has none.
    const doctor = department.doctors[0] ?? null;

    const existing = await prisma.timeSlot.findMany({
      where: {
        departmentId: department.id,
        startsAt: { gte: now, lte: horizon },
      },
      select: { startsAt: true },
    });
    const existingKeys = new Set(existing.map((s) => s.startsAt.toISOString()));

    const toCreate: Array<{
      departmentId: string;
      doctorId: string | null;
      startsAt: Date;
      endsAt: Date;
      capacity: number;
      bookedCount: number;
    }> = [];

    for (let dayOffset = 0; dayOffset < DAYS_AHEAD; dayOffset++) {
      const day = addDays(now, dayOffset);
      const weekday = day.getDay();
      if (weekday === 0) continue; // closed Sundays, matches original seed

      for (const hour of HOURS) {
        const startsAt = atHour(day, hour);
        if (startsAt <= now) continue;
        if (existingKeys.has(startsAt.toISOString())) continue;

        const endsAt = atHour(day, hour, 30);
        const capacity = hour >= 9 && hour <= 11 ? 3 : 2;

        let bookedBias = 0;
        if (hour >= 9 && hour <= 11) bookedBias += 1;
        if (weekday === 1) bookedBias += 1;
        if (hour === 15 || hour === 16) bookedBias -= 1;
        const bookedCount = Math.max(0, Math.min(capacity, bookedBias));

        toCreate.push({
          departmentId: department.id,
          doctorId: doctor?.id ?? null,
          startsAt,
          endsAt,
          capacity,
          bookedCount,
        });
      }
    }

    if (toCreate.length > 0) {
      await prisma.timeSlot.createMany({ data: toCreate });
      created += toCreate.length;
      console.log(`${department.name}: added ${toCreate.length} slot(s)`);
    } else {
      console.log(`${department.name}: already up to date`);
    }
  }

  console.log(`\nDone. Created ${created} new time slot(s) through ${horizon.toDateString()}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

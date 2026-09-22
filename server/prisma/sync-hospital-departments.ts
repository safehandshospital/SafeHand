import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { demandLevelForSlot } from "../src/services/demand.js";

const prisma = new PrismaClient();

const HOURS = [8, 9, 10, 11, 13, 14, 15, 16];
const DAYS_AHEAD = Number(process.env.BOOKING_HORIZON_DAYS ?? process.env.TOPUP_DAYS) || 60;

const DEPARTMENT_TEMPLATES = [
  {
    name: "Cardiology",
    description: "Heart and vascular specialty care.",
    summary: "Cardiology consultation, cardiovascular risk review and follow-up care.",
    category: "Specialty heart clinic",
    treatment: "Cardiovascular evaluation, ECG review, risk scoring and medication titration.",
    services: [
      "Cardiology consult",
      "ECG review",
      "Hypertension clinic",
      "Chest pain assessment",
      "Post admission follow up",
    ],
    wing: "Specialist heart clinic",
    hours: "Mon to Fri 08:00 to 16:00",
    imageUrl:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSwJTrKtlFOcsXvE70Lhjlgx0J3bnFgdxN6gGhJb8sKPA&s=10",
    doctor: {
      fullName: "Dr. Martin Adu-Adadey",
      specialty: "Cardiology consultant",
      avatarUrl:
        "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=256&h=256&q=80",
    },
    extraDoctors: [
      {
        fullName: "Dr. Kwabena Osei-Bonsu",
        specialty: "Cardiology registrar",
        avatarUrl:
          "https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=256&h=256&q=80",
      },
    ],
  },
  {
    name: "Dermatology",
    description: "Skin care and specialist dermatology review.",
    summary: "Outpatient review for rashes, chronic skin conditions, acne, eczema and lesion checks.",
    category: "Specialist skin clinic",
    treatment: "Clinical dermatology assessment with treatment plans and follow-up scheduling.",
    services: [
      "Rash and eczema review",
      "Acne plans",
      "Mole checks",
      "Dermatology consult",
      "Follow-up care",
    ],
    wing: "Specialist skin clinic",
    hours: "Mon to Fri 08:00 to 16:00",
    imageUrl:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
    doctor: {
      fullName: "Dr. J. Aryee-Boi",
      specialty: "Dermatology",
      avatarUrl:
        "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&h=256&q=80",
    },
    extraDoctors: [
      {
        fullName: "Dr. Naa Adjeley Mensah",
        specialty: "Dermatology registrar",
        avatarUrl:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
      },
    ],
  },
  {
    name: "Emergency Medicine",
    description: "Emergency, urgent care and referral assessment.",
    summary: "Emergency and referral support for urgent outpatient and acute care needs.",
    category: "Emergency and referral clinic",
    treatment: "Triage, stabilisation, referral coordination and urgent clinical review.",
    services: [
      "Emergency review",
      "Referral assessment",
      "Outpatient triage",
      "Urgent clinical review",
      "Care coordination",
    ],
    wing: "Emergency and referrals",
    hours: "Emergency support available daily; appointments Mon to Fri 08:00 to 16:00",
    imageUrl:
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80",
    doctor: {
      fullName: "Dr. Leslie Issa Adam-Zakariah",
      specialty: "Emergency medicine",
      avatarUrl:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=256&h=256&q=80",
    },
    extraDoctors: [
      {
        fullName: "Dr. Selorm Agbemava",
        specialty: "Emergency medicine registrar",
        avatarUrl:
          "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=256&h=256&q=80",
      },
    ],
  },
  {
    name: "Nephrology & Urology",
    description: "Kidney, urinary tract and specialist medical review.",
    summary: "Specialist assessment for kidney function, urinary symptoms, hypertension and referral follow ups.",
    category: "Specialist renal and urology clinic",
    treatment: "Consultant review, renal risk assessment, medication review and diagnostic follow up.",
    services: [
      "Nephrology consult",
      "Urology review",
      "Kidney function follow up",
      "Hypertension review",
      "Referral assessment",
    ],
    wing: "Renal and urology clinic",
    hours: "Mon to Fri 08:00 to 16:00",
    imageUrl:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
    doctor: {
      fullName: "Prof. Vincent Boima",
      specialty: "Consultant nephrologist",
      avatarUrl:
        "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&h=256&q=80",
    },
    extraDoctors: [
      {
        fullName: "Dr. Esi Biney",
        specialty: "Consultant urologist",
        avatarUrl:
          "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=256&h=256&q=80",
      },
    ],
  },
  {
    name: "Orthopedics",
    description: "Joints, soft tissue, and rehab planning.",
    summary: "Orthopaedic and musculoskeletal assessment with imaging review and rehab planning.",
    category: "MSK and orthopaedic clinic",
    treatment: "Specialist orthopaedic assessment with imaging review and surgical or rehab planning.",
    services: [
      "Joint assessment",
      "Sports injury review",
      "Imaging discussion",
      "Physio pathway planning",
      "Post-operative follow up",
    ],
    wing: "Orthopaedic services",
    hours: "Mon to Fri 08:00 to 17:00",
    imageUrl:
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
    doctor: {
      fullName: "Dr. (Med) Paa Kwesi Baidoo",
      specialty: "Consultant orthopaedic surgeon",
      avatarUrl:
        "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=256&h=256&q=80",
    },
    extraDoctors: [
      {
        fullName: "Dr. Yaw Frimpong-Manso",
        specialty: "Orthopaedic registrar",
        avatarUrl:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
      },
    ],
  },
  {
    name: "Pediatrics",
    description: "Child health, family care and paediatric review.",
    summary: "Paediatric and family-centred outpatient care for children and caregivers.",
    category: "Children outpatient clinic",
    treatment: "Age-appropriate assessment with caregiver counselling, growth review and referral planning.",
    services: [
      "Growth checks",
      "Fever review",
      "Vaccine counselling",
      "School medical notes",
      "Teen consults",
    ],
    wing: "Children outpatient clinic",
    hours: "Mon to Fri 08:00 to 16:00",
    imageUrl:
      "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1200&q=80",
    doctor: {
      fullName: "Dr. Victoria Lokko",
      specialty: "Specialist paediatrician",
      avatarUrl:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=256&h=256&q=80",
    },
    extraDoctors: [
      {
        fullName: "Dr. Abena Owusu-Ansah",
        specialty: "Paediatric registrar",
        avatarUrl:
          "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80",
      },
    ],
  },
] as const;

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

async function createSlots(departmentId: string, doctorId: string | null) {
  const now = new Date();
  const existing = await prisma.timeSlot.findMany({
    where: {
      departmentId,
      startsAt: { gte: now, lte: addDays(now, DAYS_AHEAD) },
    },
    select: { startsAt: true },
  });
  const existingKeys = new Set(existing.map((slot) => slot.startsAt.toISOString()));
  const slots = [];
  const snapshots = [];
  const snapshotKeys = new Set<string>();

  for (let dayOffset = 0; dayOffset < DAYS_AHEAD; dayOffset++) {
    const day = addDays(now, dayOffset);
    const weekday = day.getDay();
    if (weekday === 0) continue;

    for (const hour of HOURS) {
      const startsAt = atHour(day, hour);
      if (startsAt <= now || existingKeys.has(startsAt.toISOString())) continue;
      const endsAt = atHour(day, hour, 30);
      slots.push({
        departmentId,
        doctorId,
        startsAt,
        endsAt,
        capacity: 1,
        bookedCount: 0,
      });
      // One demand snapshot per weekday+hour bucket, not per individual slot.
      const snapshotKey = `${weekday}-${hour}`;
      if (snapshotKeys.has(snapshotKey)) continue;
      snapshotKeys.add(snapshotKey);

      const demand = demandLevelForSlot(startsAt, 0);
      snapshots.push({
        departmentId,
        slotHour: hour,
        weekday,
        level: demand.level,
        score: demand.score,
        source: "sync-heuristic",
        rationale: "Synced missing hospital department availability.",
      });
    }
  }

  if (slots.length) await prisma.timeSlot.createMany({ data: slots });
  if (snapshots.length) await prisma.demandSnapshot.createMany({ data: snapshots });
  return slots.length;
}

async function main() {
  const hospitals = await prisma.hospital.findMany({ orderBy: { name: "asc" } });
  let departmentsCreated = 0;
  let doctorsCreated = 0;
  let slotsCreated = 0;

  for (const hospital of hospitals) {
    for (const template of DEPARTMENT_TEMPLATES) {
      let department = await prisma.department.findUnique({
        where: {
          hospitalId_name: {
            hospitalId: hospital.id,
            name: template.name,
          },
        },
        include: { doctors: true },
      });

      if (!department) {
        department = await prisma.department.create({
          data: {
            hospitalId: hospital.id,
            name: template.name,
            description: template.description,
            summary: `${template.summary} at ${hospital.name}.`,
            category: template.category,
            treatment: template.treatment,
            services: [...template.services],
            priceRange: "Call hospital for current fees",
            location: hospital.address,
            wing: template.wing,
            hours: template.hours,
            phone: hospital.phone,
            imageUrl: template.imageUrl,
          },
          include: { doctors: true },
        });
        departmentsCreated += 1;
      }

      const doctorById = new Map(
        department.doctors.map((existing) => [existing.fullName, existing.id]),
      );
      const doctorSeeds = [template.doctor, ...template.extraDoctors];

      for (const doctorSeed of doctorSeeds) {
        if (doctorById.has(doctorSeed.fullName)) continue;
        const created = await prisma.doctor.create({
          data: {
            ...doctorSeed,
            departmentId: department.id,
          },
          select: { id: true },
        });
        doctorById.set(doctorSeed.fullName, created.id);
        doctorsCreated += 1;
      }

      const leadDoctorId =
        doctorById.get(template.doctor.fullName) ??
        department.doctors[0]?.id ??
        null;

      slotsCreated += await createSlots(department.id, leadDoctorId);
    }
  }

  console.log(
    `Synced ${departmentsCreated} department(s), ${doctorsCreated} doctor(s), ${slotsCreated} slot(s).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

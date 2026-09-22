import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { demandLevelForSlot } from "../src/services/demand.js";

const prisma = new PrismaClient();

const HOSPITALS = [
  {
    name: "SafeHand Medical Centre",
    description:
      "Main outpatient campus with family care, specialty clinics, and diagnostics.",
    address: "Outpatient Road, Accra",
    city: "Accra",
    phone: "+233 30 200 1100",
    imageUrl:
      "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Korle Sunrise Hospital",
    description:
      "Busy urban hospital focused on children, heart care, and general outpatient visits.",
    address: "Independence Avenue, Accra",
    city: "Accra",
    phone: "+233 30 200 2200",
    imageUrl:
      "https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=80",
  },
  {
    name: "Garden City Community Hospital",
    description:
      "Kumasi campus for outpatient care, rehab, dermatology, and follow-up clinics.",
    address: "Lake Road, Kumasi",
    city: "Kumasi",
    phone: "+233 32 200 3300",
    imageUrl:
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80",
  },
];

const DEPARTMENTS = [
  {
    hospitalName: "SafeHand Medical Centre",
    name: "General Practice",
    description: "Primary care visits and follow ups.",
    summary:
      "First stop for adults and families. Wellness checks, chronic care, and same week sick visits.",
    category: "Primary care clinic",
    treatment:
      "Shared care plans, medication review, and referrals when a specialist is needed.",
    services: [
      "Wellness review",
      "Chronic care follow up",
      "Sick visits",
      "Referral letters",
      "Blood pressure clinic",
    ],
    priceRange: "₵60 to ₵180",
    location: "Outpatient Block A",
    wing: "Ground floor, Bay 1 to 4",
    hours: "Mon to Fri 08:00 to 17:00, Sat 09:00 to 13:00",
    phone: "+233 30 200 1101",
    imageUrl:
      "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80",
  },
  {
    hospitalName: "SafeHand Medical Centre",
    name: "Pediatrics",
    description: "Care for children and teens.",
    summary:
      "Growth checks, vaccines, and acute care in a child friendly suite.",
    category: "Children outpatient clinic",
    treatment:
      "Age appropriate assessment with caregivers, growth tracking, and gentle procedures.",
    services: [
      "Growth checks",
      "Vaccine counselling",
      "Fever review",
      "School medical notes",
      "Teen consults",
    ],
    priceRange: "₵80 to ₵220",
    location: "Children Pavilion",
    wing: "Level 1, Blue wing",
    hours: "Mon to Fri 08:00 to 16:30",
    phone: "+233 30 200 1102",
    imageUrl:
      "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1200&q=80",
  },
  {
    hospitalName: "Korle Sunrise Hospital",
    name: "Cardiology",
    description: "Heart and vascular specialty care.",
    summary:
      "ECG review, blood pressure clinics, and specialist consults for chest pain and risk assessment.",
    category: "Specialty heart clinic",
    treatment:
      "Cardiovascular evaluation, ECG review, risk scoring, and medication titration.",
    services: [
      "Cardiology consult",
      "ECG review",
      "Hypertension clinic",
      "Chest pain assessment",
      "Post admission follow up",
    ],
    priceRange: "₵150 to ₵420",
    location: "Specialty Tower",
    wing: "Level 3, Heart suite",
    hours: "Mon to Thu 08:30 to 16:00, Fri 08:30 to 14:00",
    phone: "+233 30 200 1103",
    imageUrl:
      "https://images.unsplash.com/photo-1581595220892-b0739db3b8c5?auto=format&fit=crop&w=1200&q=80",
  },
  {
    hospitalName: "Garden City Community Hospital",
    name: "Dermatology",
    description: "Skin care and minor procedures.",
    summary:
      "Rash review, acne and eczema plans, mole checks, and scheduled minor procedures.",
    category: "Skin clinic",
    treatment:
      "Clinical dermatology with topical or systemic plans and minor procedures when needed.",
    services: [
      "Rash and eczema review",
      "Acne plans",
      "Mole checks",
      "Cryotherapy booking",
      "Post procedure follow up",
    ],
    priceRange: "₵100 to ₵350",
    location: "Outpatient Block B",
    wing: "Level 2, Rooms D1 to D6",
    hours: "Tue to Fri 09:00 to 16:00",
    phone: "+233 30 200 1104",
    imageUrl:
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80",
  },
  {
    hospitalName: "Garden City Community Hospital",
    name: "Orthopedics",
    description: "Joints, soft tissue, and rehab planning.",
    summary:
      "MSK assessment, imaging review, and physio pathways for sports and workplace injuries.",
    category: "MSK and rehab clinic",
    treatment:
      "Hands on assessment with imaging review and staged rehab with physiotherapy partners.",
    services: [
      "Joint assessment",
      "Sports injury review",
      "Imaging discussion",
      "Physio pathway planning",
      "Injection clinic booking",
    ],
    priceRange: "₵120 to ₵380",
    location: "Rehab and MSK Centre",
    wing: "Ground floor, near gym",
    hours: "Mon to Fri 08:00 to 17:00",
    phone: "+233 30 200 1105",
    imageUrl:
      "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80",
  },
];

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
  console.log("Seeding healthcare-booking…");

  await prisma.healthFile.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.aiPromptLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.demandSnapshot.deleteMany();
  await prisma.timeSlot.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.department.deleteMany();
  await prisma.hospital.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const patient = await prisma.user.create({
    data: {
      email: "patient@example.com",
      passwordHash,
      fullName: "Ama Mensah",
      avatarUrl:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80",
      role: "PATIENT",
      phone: "+233200000001",
    },
  });

  const extraPatients = await Promise.all(
    [
      {
        email: "yaw.boateng@example.com",
        fullName: "Yaw Boateng",
        avatarUrl:
          "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&h=256&q=80",
        phone: "+233200000011",
      },
      {
        email: "efua.darko@example.com",
        fullName: "Efua Darko",
        avatarUrl:
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80",
        phone: "+233200000012",
      },
      {
        email: "kofi.ansah@example.com",
        fullName: "Kofi Ansah",
        avatarUrl:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=256&h=256&q=80",
        phone: "+233200000013",
      },
      {
        email: "akua.sarpong@example.com",
        fullName: "Akua Sarpong",
        avatarUrl:
          "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=256&h=256&q=80",
        phone: "+233200000014",
      },
    ].map((p) =>
      prisma.user.create({
        data: {
          ...p,
          passwordHash,
          role: "PATIENT" as const,
        },
      }),
    ),
  );

  const patientPool = [patient, ...extraPatients];

  const staff = await prisma.user.create({
    data: {
      email: "staff@example.com",
      passwordHash,
      fullName: "Kwame Asante",
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80",
      role: "STAFF",
      phone: "+233200000002",
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const VISIT_TEMPLATES: Record<
  string,
  Array<{
    topic: string;
    purpose: string;
    description: string;
    files: Array<{
      name: string;
      kind: "SCAN" | "LAB" | "REPORT" | "IMAGE" | "OTHER";
      sizeLabel: string;
      note: string;
      url: string;
    }>;
  }>
> = {
  "General Practice": [
    {
      topic: "Annual wellness review",
      purpose:
        "Establish a baseline health plan and follow up on blood-pressure trends for the patient and care team.",
      description:
        "Patient presents for a yearly check-in covering vitals, medication review, and lifestyle counselling. GP will reconcile chronic-care goals with recent home readings.",
      files: [
        {
          name: "Home BP log (30 days).pdf",
          kind: "REPORT",
          sizeLabel: "240 KB",
          note: "Patient-uploaded blood pressure diary",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        },
        {
          name: "Prior labs metabolic panel.pdf",
          kind: "LAB",
          sizeLabel: "180 KB",
          note: "Last panel from 3 months ago",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        },
      ],
    },
  ],
  Pediatrics: [
    {
      topic: "Kids growth & vaccine check",
      purpose:
        "Confirm growth trajectory and complete overdue immunizations with the pediatric clinician.",
      description:
        "Routine pediatric visit for height/weight plotting, developmental screen, and catch-up vaccines. Caregivers requested discussion of sleep patterns.",
      files: [
        {
          name: "Growth chart snapshot.png",
          kind: "IMAGE",
          sizeLabel: "420 KB",
          note: "WHO growth curve export",
          url: "https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=800&q=80",
        },
        {
          name: "Immunization record.pdf",
          kind: "REPORT",
          sizeLabel: "110 KB",
          note: "National immunization card scan",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        },
      ],
    },
  ],
  Cardiology: [
    {
      topic: "Understanding cardiology consult",
      purpose:
        "Review chest discomfort history and decide whether further cardiac workup is needed.",
      description:
        "First cardiology outpatient consult after GP referral for intermittent chest tightness on exertion. Focus on ECG interpretation, risk stratification, and shared decision-making on stress testing.",
      files: [
        {
          name: "12-lead ECG.pdf",
          kind: "SCAN",
          sizeLabel: "860 KB",
          note: "Referral ECG from GP clinic",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        },
        {
          name: "Chest X-ray.png",
          kind: "IMAGE",
          sizeLabel: "1.2 MB",
          note: "PA chest radiograph",
          url: "https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=800&q=80",
        },
        {
          name: "Lipid panel.pdf",
          kind: "LAB",
          sizeLabel: "95 KB",
          note: "Fasting lipids from last week",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        },
      ],
    },
    {
      topic: "Kids cardiology check",
      purpose:
        "Follow murmur findings and reassure family on activity clearance.",
      description:
        "Pediatric cardiology follow-up for an innocent murmur flagged at school sports screening. Echo review and activity guidance for parents and school.",
      files: [
        {
          name: "Echocardiogram report.pdf",
          kind: "REPORT",
          sizeLabel: "540 KB",
          note: "Transthoracic echo summary",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        },
      ],
    },
  ],
  Dermatology: [
    {
      topic: "Skin lesion review",
      purpose:
        "Assess changing mole and decide on biopsy versus monitoring.",
      description:
        "Dermatology visit for a pigmented lesion on the left shoulder noted to change over 6 weeks. Dermoscopy photos attached for clinician comparison.",
      files: [
        {
          name: "Dermoscopy photo.jpg",
          kind: "IMAGE",
          sizeLabel: "780 KB",
          note: "Close-up lesion image",
          url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80",
        },
      ],
    },
  ],
  Orthopedics: [
    {
      topic: "Knee pain assessment",
      purpose:
        "Evaluate sports injury and plan rehab versus imaging follow-up.",
      description:
        "Orthopedic outpatient review after twisting injury during football. Goal is to rule out ligament injury and set a return-to-play timeline.",
      files: [
        {
          name: "Knee MRI slices.pdf",
          kind: "SCAN",
          sizeLabel: "2.4 MB",
          note: "MRI referral pack",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        },
        {
          name: "Physio notes.pdf",
          kind: "REPORT",
          sizeLabel: "130 KB",
          note: "Community physio progress note",
          url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        },
      ],
    },
  ],
};

const DOCTORS: Record<
  string,
  { fullName: string; specialty: string; avatarUrl: string }
> = {
  "General Practice": {
    fullName: "Dr. Efua Boateng",
    specialty: "Family medicine",
    avatarUrl:
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=256&h=256&q=80",
  },
  Pediatrics: {
    fullName: "Dr. Kojo Mensah",
    specialty: "Pediatric outpatient care",
    avatarUrl:
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=256&h=256&q=80",
  },
  Cardiology: {
    fullName: "Dr. Abena Owusu",
    specialty: "Cardiovascular medicine",
    avatarUrl:
      "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=256&h=256&q=80",
  },
  Dermatology: {
    fullName: "Dr. Nii Armah",
    specialty: "Clinical dermatology",
    avatarUrl:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=256&h=256&q=80",
  },
  Orthopedics: {
    fullName: "Dr. Ama Sarpong",
    specialty: "Musculoskeletal care",
    avatarUrl:
      "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=256&h=256&q=80",
  },
};

  function buildTitle(topic: string, doctorName: string) {
    return `${topic} with ${doctorName}`;
  }

  let visitCursor = 0;

  const hospitals = new Map<string, { id: string }>();
  for (const hospital of HOSPITALS) {
    const created = await prisma.hospital.create({ data: hospital });
    hospitals.set(created.name, created);
  }

  for (const dept of DEPARTMENTS) {
    const { hospitalName, ...departmentData } = dept;
    const hospital = hospitals.get(hospitalName);
    if (!hospital) throw new Error(`Missing hospital "${hospitalName}"`);
    const department = await prisma.department.create({
      data: {
        ...departmentData,
        hospitalId: hospital.id,
      },
    });
    const doc = DOCTORS[dept.name] ?? {
      fullName: `Dr. ${dept.name}`,
      specialty: dept.name,
      avatarUrl:
        "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=256&h=256&q=80",
    };

    const doctor = await prisma.doctor.create({
      data: {
        fullName: doc.fullName,
        specialty: doc.specialty,
        avatarUrl: doc.avatarUrl,
        departmentId: department.id,
      },
    });

    const templates = VISIT_TEMPLATES[dept.name] ?? [
      {
        topic: `${dept.name} consultation`,
        purpose: `Discuss care goals for this ${dept.name.toLowerCase()} visit.`,
        description: `Outpatient ${dept.name.toLowerCase()} appointment.`,
        files: [],
      },
    ];

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const day = addDays(today, dayOffset);
      const weekday = day.getDay();
      if (weekday === 0) continue;

      for (const hour of [8, 9, 10, 11, 13, 14, 15, 16]) {
        const startsAt = atHour(day, hour);
        const endsAt = atHour(day, hour, 30);
        const capacity = 1;

        let bookedBias = 0;
        if (hour >= 9 && hour <= 11) bookedBias += 1;
        if (weekday === 1) bookedBias += 1;
        if (hour === 15 || hour === 16) bookedBias -= 1;
        const bookedCount = Math.max(0, Math.min(capacity, bookedBias));

        const slot = await prisma.timeSlot.create({
          data: {
            departmentId: department.id,
            doctorId: doctor.id,
            startsAt,
            endsAt,
            capacity,
            bookedCount,
          },
        });

        const fill = capacity ? bookedCount / capacity : 0;
        const demand = demandLevelForSlot(startsAt, fill);
        await prisma.demandSnapshot.create({
          data: {
            departmentId: department.id,
            slotHour: hour,
            weekday,
            level: demand.level,
            score: demand.score,
            source: "seed-heuristic",
            rationale: `Seeded density for ${dept.name}`,
          },
        });

        // Seed richer sample appointments on near-term booked slots
        if (bookedCount > 0 && dayOffset < 3) {
          const template = templates[visitCursor % templates.length];
          const assignee = patientPool[visitCursor % patientPool.length]!;
          visitCursor += 1;
          const title = buildTitle(template.topic, doctor.fullName);

          const appointment = await prisma.appointment.create({
            data: {
              userId: assignee.id,
              departmentId: department.id,
              doctorId: doctor.id,
              timeSlotId: slot.id,
              status: dayOffset === 0 ? "BOOKED" : "COMPLETED",
              title,
              topic: template.topic,
              purpose: template.purpose,
              description: template.description,
              notes: "Patient confirmed availability by SMS.",
              healthFiles: {
                create: template.files.map((f) => ({
                  name: f.name,
                  kind: f.kind,
                  sizeLabel: f.sizeLabel,
                  note: f.note,
                  url: f.url,
                  mimeType: f.name.endsWith(".pdf")
                    ? "application/pdf"
                    : "image/jpeg",
                })),
              },
            },
          });
          void appointment;
        }
      }
    }
  }

  console.log("Seed complete.");
  console.log("Patient: patient@example.com / password123");
  console.log("Staff:   staff@example.com / password123");
  console.log(`Users: ${patient.id}, ${staff.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

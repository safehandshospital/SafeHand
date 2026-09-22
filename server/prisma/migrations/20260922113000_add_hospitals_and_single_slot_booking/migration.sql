CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Hospital_name_key" ON "Hospital"("name");

INSERT INTO "Hospital" ("id", "name", "description", "address", "city", "phone", "imageUrl", "createdAt", "updatedAt")
VALUES (
    'default-hospital',
    'SafeHand Medical Centre',
    'Main outpatient campus for SafeHand appointments.',
    'Outpatient Road, Accra',
    'Accra',
    '+233 30 200 1100',
    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

ALTER TABLE "Department" ADD COLUMN "hospitalId" TEXT;

UPDATE "Department" SET "hospitalId" = 'default-hospital' WHERE "hospitalId" IS NULL;

ALTER TABLE "Department" ALTER COLUMN "hospitalId" SET NOT NULL;

DROP INDEX IF EXISTS "Department_name_key";

CREATE UNIQUE INDEX "Department_hospitalId_name_key" ON "Department"("hospitalId", "name");
CREATE INDEX "Department_hospitalId_idx" ON "Department"("hospitalId");

ALTER TABLE "Department"
ADD CONSTRAINT "Department_hospitalId_fkey"
FOREIGN KEY ("hospitalId") REFERENCES "Hospital"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

UPDATE "TimeSlot"
SET "capacity" = 1,
    "bookedCount" = CASE WHEN "bookedCount" > 0 THEN 1 ELSE 0 END
WHERE "capacity" <> 1 OR "bookedCount" > 1;

CREATE UNIQUE INDEX "Appointment_one_booked_per_slot"
ON "Appointment"("timeSlotId")
WHERE "status" = 'BOOKED';

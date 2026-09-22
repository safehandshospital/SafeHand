INSERT INTO "Hospital" ("id", "name", "description", "address", "city", "phone", "imageUrl", "createdAt", "updatedAt")
VALUES
  (
    'hospital-korle-bu',
    'Korle Bu Teaching Hospital',
    'Ghana''s premier teaching and quaternary referral hospital, serving specialist and national referral needs.',
    'Guggisberg Avenue, Korle Bu, Accra. Digital address: GA-221-1570',
    'Accra',
    '+233 302 739 510 / +233 244 406 700',
    'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=1200&q=80',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'hospital-37-military',
    '37 Military Hospital',
    'Military teaching and specialist hospital on Liberation Road, also open to the general public.',
    'Liberation Road, Accra',
    'Accra',
    '+233 302 767 691 / Emergency: +233 256 112 222',
    'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=80',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'hospital-garh',
    'Greater Accra Regional Hospital',
    'Ridge Hospital is a public regional referral hospital providing secondary to tertiary care.',
    'Castle Road, Ridge, Accra',
    'Accra',
    '+233 302 428 460 / +233 551 727 552',
    'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'hospital-ugmc',
    'University of Ghana Medical Centre',
    'Quaternary medical, training and research centre on the University of Ghana campus.',
    'University of Ghana Medical Centre, Legon. GPS: GA-337-6980',
    'Accra',
    '+233 302 550 843 / +233 302 550 844 / +233 551 995 599',
    'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'hospital-nyaho',
    'Nyaho Medical Centre',
    'Private multispecialty medical centre with 24/7 main branch services in Airport Residential Area.',
    '35 Kofi Annan Street, Airport Residential Area, Accra',
    'Accra',
    '+233 307 086 490 / +233 501 436 662',
    'https://images.unsplash.com/photo-1504439468489-c8920d796a29?auto=format&fit=crop&w=1200&q=80',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'hospital-kath',
    'Komfo Anokye Teaching Hospital',
    'Public teaching and specialist referral hospital serving Kumasi, Ashanti Region and beyond.',
    'Bantama, Kumasi, Ashanti Region',
    'Kumasi',
    '+233 556 490 029',
    'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "address" = EXCLUDED."address",
  "city" = EXCLUDED."city",
  "phone" = EXCLUDED."phone",
  "imageUrl" = EXCLUDED."imageUrl",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Department"
SET
  "hospitalId" = (SELECT "id" FROM "Hospital" WHERE "name" = 'Korle Bu Teaching Hospital' LIMIT 1),
  "name" = 'Nephrology & Urology',
  "description" = 'Kidney, urinary tract and specialist medical review.',
  "summary" = 'Specialist assessment for kidney function, urinary symptoms, hypertension and referral follow ups.',
  "category" = 'Specialist renal and urology clinic',
  "treatment" = 'Consultant review, renal risk assessment, medication review and diagnostic follow up.',
  "services" = '["Nephrology consult","Urology review","Kidney function follow up","Hypertension review","Referral assessment"]'::jsonb,
  "priceRange" = 'Call hospital for current fees',
  "location" = 'Guggisberg Avenue, Korle Bu',
  "wing" = 'Specialist outpatient services',
  "hours" = 'Mon to Fri 08:00 to 16:00',
  "phone" = '+233 302 739 510',
  "imageUrl" = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=80',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" IN ('General Practice', 'Nephrology & Urology');

UPDATE "Department"
SET
  "hospitalId" = (SELECT "id" FROM "Hospital" WHERE "name" = '37 Military Hospital' LIMIT 1),
  "description" = 'Skin care and specialist dermatology review.',
  "summary" = 'Outpatient review for rashes, chronic skin conditions, acne, eczema and lesion checks.',
  "category" = 'Specialist skin clinic',
  "treatment" = 'Clinical dermatology assessment with treatment plans and follow-up scheduling.',
  "services" = '["Rash and eczema review","Acne plans","Mole checks","Dermatology consult","Follow-up care"]'::jsonb,
  "priceRange" = 'Call hospital for current fees',
  "location" = 'Liberation Road, Accra',
  "wing" = 'Medical Division',
  "hours" = 'Mon to Fri 08:00 to 16:00',
  "phone" = '+233 302 767 691',
  "imageUrl" = 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'Dermatology';

UPDATE "Department"
SET
  "hospitalId" = (SELECT "id" FROM "Hospital" WHERE "name" = 'University of Ghana Medical Centre' LIMIT 1),
  "description" = 'Heart and vascular specialty care.',
  "summary" = 'Cardiology consultation, cardiovascular risk review and follow-up care at UGMC.',
  "category" = 'Specialty heart clinic',
  "treatment" = 'Cardiovascular evaluation, ECG review, risk scoring and medication titration.',
  "services" = '["Cardiology consult","ECG review","Hypertension clinic","Chest pain assessment","Post admission follow up"]'::jsonb,
  "priceRange" = 'Call hospital for current fees',
  "location" = 'University of Ghana Medical Centre, Legon',
  "wing" = 'Specialist outpatient services',
  "hours" = 'Mon to Fri 08:00 to 16:00',
  "phone" = '+233 302 550 843',
  "imageUrl" = 'https://images.unsplash.com/photo-1581595220892-b0739db3b8c5?auto=format&fit=crop&w=1200&q=80',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'Cardiology';

UPDATE "Department"
SET
  "hospitalId" = (SELECT "id" FROM "Hospital" WHERE "name" = 'Nyaho Medical Centre' LIMIT 1),
  "description" = 'Child health, family care and paediatric review.',
  "summary" = 'Paediatric and family-centred outpatient care at Nyaho''s Airport main branch.',
  "category" = 'Children outpatient clinic',
  "treatment" = 'Age-appropriate assessment with caregiver counselling, growth review and referral planning.',
  "services" = '["Growth checks","Fever review","Vaccine counselling","School medical notes","Teen consults"]'::jsonb,
  "priceRange" = 'Call hospital for current fees',
  "location" = '35 Kofi Annan Street, Airport Residential Area',
  "wing" = 'Main Branch',
  "hours" = 'Main Branch 24/7; outpatient booking hours vary',
  "phone" = '+233 307 086 490 / +233 501 436 662',
  "imageUrl" = 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&w=1200&q=80',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'Pediatrics';

UPDATE "Department"
SET
  "hospitalId" = (SELECT "id" FROM "Hospital" WHERE "name" = 'Komfo Anokye Teaching Hospital' LIMIT 1),
  "description" = 'Joints, soft tissue, and rehab planning.',
  "summary" = 'Orthopaedic and musculoskeletal assessment at Kumasi''s major teaching hospital.',
  "category" = 'MSK and orthopaedic clinic',
  "treatment" = 'Specialist orthopaedic assessment with imaging review and surgical or rehab planning.',
  "services" = '["Joint assessment","Sports injury review","Imaging discussion","Physio pathway planning","Post-operative follow up"]'::jsonb,
  "priceRange" = 'Call hospital for current fees',
  "location" = 'Bantama, Kumasi',
  "wing" = 'Orthopaedic services',
  "hours" = 'Mon to Fri 08:00 to 17:00',
  "phone" = '+233 556 490 029',
  "imageUrl" = 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "name" = 'Orthopedics';

INSERT INTO "Department" (
  "id", "hospitalId", "name", "description", "summary", "category", "treatment", "services",
  "priceRange", "location", "wing", "hours", "phone", "imageUrl", "colorHint", "createdAt", "updatedAt"
)
VALUES (
  'department-garh-emergency',
  (SELECT "id" FROM "Hospital" WHERE "name" = 'Greater Accra Regional Hospital' LIMIT 1),
  'Emergency Medicine',
  'Emergency, urgent care and referral assessment.',
  'Emergency and referral support for urgent outpatient and acute care needs at Ridge Hospital.',
  'Emergency and referral clinic',
  'Triage, stabilisation, referral coordination and urgent clinical review.',
  '["Emergency review","Referral assessment","Outpatient triage","Urgent clinical review","Care coordination"]'::jsonb,
  'Call hospital for current fees',
  'Castle Road, Ridge',
  'Emergency / referrals',
  'Emergency support available daily; appointments Mon to Fri 08:00 to 16:00',
  '+233 302 428 477 / +233 302 428 460',
  'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=1200&q=80',
  '#0052FF',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("hospitalId", "name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "summary" = EXCLUDED."summary",
  "category" = EXCLUDED."category",
  "treatment" = EXCLUDED."treatment",
  "services" = EXCLUDED."services",
  "priceRange" = EXCLUDED."priceRange",
  "location" = EXCLUDED."location",
  "wing" = EXCLUDED."wing",
  "hours" = EXCLUDED."hours",
  "phone" = EXCLUDED."phone",
  "imageUrl" = EXCLUDED."imageUrl",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "Doctor" d
SET "fullName" = 'Prof. Vincent Boima', "specialty" = 'Consultant nephrologist', "updatedAt" = CURRENT_TIMESTAMP
FROM "Department" dept
WHERE d."departmentId" = dept."id" AND dept."name" = 'Nephrology & Urology';

UPDATE "Doctor" d
SET "fullName" = 'Dr. J. Aryee-Boi', "specialty" = 'Dermatology', "updatedAt" = CURRENT_TIMESTAMP
FROM "Department" dept
WHERE d."departmentId" = dept."id" AND dept."name" = 'Dermatology';

UPDATE "Doctor" d
SET "fullName" = 'Dr. Martin Adu-Adadey', "specialty" = 'Cardiology consultant', "updatedAt" = CURRENT_TIMESTAMP
FROM "Department" dept
WHERE d."departmentId" = dept."id" AND dept."name" = 'Cardiology';

UPDATE "Doctor" d
SET "fullName" = 'Dr. Victoria Lokko', "specialty" = 'Specialist paediatrician', "updatedAt" = CURRENT_TIMESTAMP
FROM "Department" dept
WHERE d."departmentId" = dept."id" AND dept."name" = 'Pediatrics';

UPDATE "Doctor" d
SET "fullName" = 'Dr. (Med) Paa Kwesi Baidoo', "specialty" = 'Consultant orthopaedic surgeon', "updatedAt" = CURRENT_TIMESTAMP
FROM "Department" dept
WHERE d."departmentId" = dept."id" AND dept."name" = 'Orthopedics';

INSERT INTO "Doctor" ("id", "fullName", "specialty", "avatarUrl", "departmentId", "createdAt", "updatedAt")
SELECT
  'doctor-garh-emergency',
  'Dr. Leslie Issa Adam-Zakariah',
  'Emergency and referral leadership',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=256&h=256&q=80',
  dept."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Department" dept
WHERE dept."hospitalId" = (SELECT "id" FROM "Hospital" WHERE "name" = 'Greater Accra Regional Hospital' LIMIT 1)
  AND dept."name" = 'Emergency Medicine'
  AND NOT EXISTS (
    SELECT 1 FROM "Doctor" d WHERE d."departmentId" = dept."id"
  );

DELETE FROM "Hospital"
WHERE "name" IN (
  'SafeHand Medical Centre',
  'Korle Sunrise Hospital',
  'Garden City Community Hospital'
)
AND "id" NOT IN (
  SELECT DISTINCT "hospitalId" FROM "Department"
);

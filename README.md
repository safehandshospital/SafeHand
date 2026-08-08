# AI Healthcare Appointment Booking

Full-stack **HealthBook** prototype: Expo React Native (web + mobile) + Fastify + PostgreSQL, with OpenAI-powered scheduling intelligence. Design discipline mirrors [Munchkin](../startups/munchkin). Custom Random Forest / TensorFlow.js demand models are deferred to `ml/` (Phase 6).

## Structure

```text
healthcare-booking/
  app/       # Expo + expo-router (RN Web / iOS / Android)
  server/    # Fastify API + Prisma
  docs/      # DESIGN.md, proposal PDF
  ml/        # Future RF + TF.js pipeline (stub)
```

## Prerequisites

- Node 20+
- PostgreSQL (local DB `healthcare_booking`)
- Optional: `OPENAI_API_KEY` in `server/.env`

## Setup

```bash
# Database (once)
createdb healthcare_booking

# API
cd server
cp .env.example .env   # edit DATABASE_URL / JWT / OpenAI
npm install
npx prisma db push
npm run db:seed

# App
cd ../app
npm install
```

## Run

```bash
# Terminal 1 — API :4100
cd server && npm run dev

# Terminal 2 — Expo web
cd app && npx expo start --web
```

Demo accounts (from seed):

| Role | Email | Password |
|------|-------|----------|
| Patient | `patient@example.com` | `password123` |
| Staff | `staff@example.com` | `password123` |

## Features (v1)

- Auth (patient / staff)
- Department browse + slot calendar with demand badges
- Book / cancel appointments
- AI recommend-slots + patient assistant + staff demand outlook (OpenAI + heuristic fallback)
- Responsive shells: phone tabs, tablet split, desktop sidebar
- Evaluation metrics endpoint for academic reporting

## Design

See [docs/DESIGN.md](docs/DESIGN.md).

## Tests

```bash
cd server && npm test
```

## Proposal reference

Original academic proposal PDF: [docs/proposal/](docs/proposal/).

## Deploy (Vercel — Expo web)

The Expo web app is a static export under `app/`. In the Vercel project:

1. **Root Directory:** `app`
2. **Build Command:** `npm run build` (runs `npx expo export --platform web`)
3. **Output Directory:** `dist`
4. **Environment variable:** `EXPO_PUBLIC_API_URL` = your production API base URL (e.g. `https://api.example.com`)

`app/vercel.json` already sets the build command, output directory, and SPA rewrites for client-side routing. Framework preset can be **Other**.

```bash
# Verify the export locally
cd app && npm run build
# → produces app/dist (gitignored)
```

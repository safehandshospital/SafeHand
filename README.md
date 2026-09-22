# AI Healthcare Appointment Booking

Full-stack **HealthBook** prototype: Expo React Native (web + mobile) + Fastify + PostgreSQL, with AI-powered scheduling intelligence - busy-time prediction, quieter-slot recommendations, and a patient assistant (all with a built-in fallback that works even without an API key).

## Structure

```text
healthcare-booking/
  app/       # Expo + expo-router (RN Web / iOS / Android)
  server/    # Fastify API + Prisma
  docs/      # DESIGN.md, proposal PDF
  ml/        # Future RF + TF.js pipeline (stub)
```

## Prerequisites

- Node.js 20+ and npm
- PostgreSQL 14+ running locally
- Optional: an `OPENAI_API_KEY` (the app runs fine without one - it uses the built-in heuristic AI)

## Quick start (local)

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd SafeHand

# 2. Create the local database
createdb healthcare_booking
#    or:  psql -U postgres -c "CREATE DATABASE healthcare_booking;"

# 3. Configure the server
cd server
cp .env.example .env
#    edit .env and set DATABASE_URL, DIRECT_URL and JWT_SECRET (see table below)

# 4. Install, create tables, and load demo data
npm install          # also runs `prisma generate`
npx prisma db push   # creates the tables
npm run db:seed      # 6 hospitals x 6 departments, 2 doctors each, ~60 days of open slots
```

## Run

Open **two terminals**:

```bash
# Terminal 1 - API (:4100)
cd server && npm run dev

# Terminal 2 - web app (:3100)
cd app && npm run web
```

Then open **http://localhost:3100**.

(macOS/Linux only: you can instead run `npm run dev` from the repo root to start both.)

Demo accounts (created by the seed):

| Role    | Email                 | Password     |
|---------|-----------------------|--------------|
| Patient | `patient@example.com` | `password123` |
| Staff   | `staff@example.com`   | `password123` |

## Environment variables

Only **`server/.env`** is required. The web app needs no `.env` locally.

`server/.env`:

| Variable              | Required | Notes |
|-----------------------|----------|-------|
| `DATABASE_URL`        | Yes      | `postgresql://postgres:YOUR_PASSWORD@localhost:5432/healthcare_booking?schema=public` |
| `DIRECT_URL`          | Yes      | Same as `DATABASE_URL` for local dev |
| `JWT_SECRET`          | Yes      | Any long random string |
| `PORT`                | No       | Default `4100` |
| `HOST`                | No       | Default `0.0.0.0` |
| `OPENAI_API_KEY`      | No       | Leave empty for the built-in heuristic AI; set a real key for LLM-generated advice |
| `OPENAI_MODEL`        | No       | Default `gpt-4o-mini` |
| `AGENTROUTER_API_KEY` | No       | Optional free/proxied provider (tried first) |
| `AGENTROUTER_*`       | No       | Base URL / model / user-agent - leave the defaults |

Phone (optional): the web app defaults to `http://localhost:4100`. To run Expo on a real phone, create `app/.env` with:

```
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTERS_LAN_IP:4100
```

## Features (v1)

- Auth (patient / staff)
- Hospital -> department -> doctor drill-down with open-slot calendar and demand badges
- Book / cancel / custom-book appointments up to 2 years ahead
- AI booking advisor: flags usually-busy times and suggests quieter windows (OpenAI/AgentRouter + heuristic fallback)
- Patient assistant + staff demand outlook + evaluation metrics endpoint
- Responsive shells: phone tabs, tablet split, desktop sidebar

## Design

See [docs/DESIGN.md](docs/DESIGN.md).

## Tests

```bash
cd server && npm test
```

## Proposal reference

Original academic proposal PDF: [docs/proposal/](docs/proposal/).

## Deploy (Vercel)

The Expo web app is a static export under `app/`. In the Vercel project:

1. **Root Directory:** `app`
2. **Build Command:** `npm run build` (runs `npx expo export --platform web`)
3. **Output Directory:** `dist`
4. **Environment variable:** `EXPO_PUBLIC_API_URL` = your production API base URL

`app/vercel.json` already sets the build command, output directory, and SPA rewrites.

The API (`server/`) deploys as a separate Vercel project with root directory `server`, and needs `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` and (optionally) `OPENAI_API_KEY` / `AGENTROUTER_API_KEY` set in its environment.

```bash
# Verify the export locally
cd app && npm run build
# -> produces app/dist (gitignored)
```
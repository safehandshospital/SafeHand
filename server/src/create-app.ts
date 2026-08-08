import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import { PrismaClient } from "@prisma/client";
import { authRoutes } from "./routes/auth.js";
import { departmentRoutes } from "./routes/departments.js";
import { slotRoutes } from "./routes/slots.js";
import { appointmentRoutes } from "./routes/appointments.js";
import { aiRoutes } from "./routes/ai.js";
import { metricsRoutes } from "./routes/metrics.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; role: "PATIENT" | "STAFF"; email: string };
    user: { sub: string; role: "PATIENT" | "STAFF"; email: string };
  }
}

const prisma = new PrismaClient();

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || "dev-secret",
  });

  await app.register(rateLimit, {
    max: 120,
    timeWindow: "1 minute",
  });

  app.decorate("prisma", prisma);

  app.decorate("authenticate", async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Unauthorized" });
    }
  });

  app.get("/", async () => ({
    ok: true,
    service: "healthcare-booking",
    health: "/health",
  }));
  app.get("/health", async () => ({ ok: true, service: "healthcare-booking" }));

  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(departmentRoutes, { prefix: "/api/departments" });
  await app.register(slotRoutes, { prefix: "/api/slots" });
  await app.register(appointmentRoutes, { prefix: "/api/appointments" });
  await app.register(aiRoutes, { prefix: "/api/ai" });
  await app.register(metricsRoutes, { prefix: "/api/metrics" });

  return app;
}

let appPromise: ReturnType<typeof buildApp> | null = null;

export function getApp() {
  appPromise ??= buildApp();
  return appPromise;
}

export { prisma };

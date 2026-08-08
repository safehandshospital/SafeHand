import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";

const avatarUrlSchema = z
  .string()
  .trim()
  .url("Profile photo URL is required")
  .refine(
    (value) => value.startsWith("http://") || value.startsWith("https://"),
    "Profile photo must be an http or https URL",
  );

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  avatarUrl: avatarUrlSchema,
  phone: z.string().optional(),
  role: z.enum(["PATIENT", "STAFF"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const userPublicSelect = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  role: true,
  phone: true,
} as const;

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const { email, password, fullName, avatarUrl, phone, role } = parsed.data;
    const existing = await app.prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await app.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        fullName,
        avatarUrl,
        phone,
        role: role === "STAFF" ? "STAFF" : "PATIENT",
      },
      select: userPublicSelect,
    });

    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token };
  });

  app.post("/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const email = parsed.data.email.toLowerCase();
    const user = await app.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        phone: user.phone,
      },
      token,
    };
  });

  app.get(
    "/me",
    { preHandler: [(app as any).authenticate] },
    async (request) => {
      const { sub } = request.user;
      const user = await app.prisma.user.findUnique({
        where: { id: sub },
        select: userPublicSelect,
      });
      return { user };
    },
  );
};

import { getApp, prisma } from "./create-app.js";

const app = await getApp();

const port = Number(process.env.PORT || 4100);
const host = process.env.HOST || "0.0.0.0";

try {
  await app.listen({ port, host });
  app.log.info(`API listening on http://${host}:${port}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

export { app, prisma };

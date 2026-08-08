import type { IncomingMessage, ServerResponse } from "node:http";
import { getApp } from "../src/app.js";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const app = await getApp();
  await app.ready();
  app.server.emit("request", req, res);
}

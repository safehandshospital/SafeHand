import { OpenAI } from "openai";
import { createChatProvider, type ChatProvider } from "./completions.js";

const baseURL = process.env.AGENTROUTER_BASE_URL || "https://agentrouter.org/v1";
const model = process.env.AGENTROUTER_MODEL || "deepseek-v4-flash";
const adminModel = process.env.AGENTROUTER_MODEL_ADMIN || model;
// AgentRouter only serves clients whose User-Agent matches an allow-listed coding tool.
const userAgent =
  process.env.AGENTROUTER_USER_AGENT || "claude-cli/1.0.0 (external, cli)";

export function agentrouterProvider(): ChatProvider | null {
  const key = process.env.AGENTROUTER_API_KEY?.trim();
  if (!key) return null;

  return createChatProvider({
    name: "agentrouter",
    client: new OpenAI({
      apiKey: key,
      baseURL,
      defaultHeaders: { "User-Agent": userAgent },
    }),
    model,
    adminModel,
  });
}

import { OpenAI } from "openai";
import { createChatProvider, type ChatProvider } from "./completions.js";

const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const adminModel = process.env.OPENAI_MODEL_ADMIN || model;

export function openaiProvider(): ChatProvider | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;

  return createChatProvider({
    name: "openai",
    client: new OpenAI({ apiKey: key }),
    model,
    adminModel,
  });
}

import type { OpenAI } from "openai";
import {
  buildChatMessages,
  buildOutlookMessages,
  buildRecommendMessages,
  type ChatDbContext,
  type SlotInput,
} from "./prompts.js";

export type RecommendResult = {
  ok: boolean;
  provider: string;
  model: string;
  summary?: string;
  recommendations?: Array<{
    slotId: string;
    rank: number;
    demandLevel: string;
    reason: string;
  }>;
  error?: string;
};

export type ChatResult = {
  ok: boolean;
  provider: string;
  model: string;
  reply?: string;
  error?: string;
};

export type OutlookResult = {
  ok: boolean;
  provider: string;
  model: string;
  outlook?: string;
  error?: string;
};

/** Some free/pooled proxies (AgentRouter) return HTTP 200 with empty content instead of erroring. */
function isBlank(text: string | null | undefined): boolean {
  return !text || text.trim().length === 0;
}

export type ChatProvider = {
  name: string;
  recommendSlots(input: {
    departmentName: string;
    preference?: string;
    slots: SlotInput[];
  }): Promise<RecommendResult>;
  chatAssistant(input: {
    message: string;
    departmentName?: string;
    context?: ChatDbContext;
  }): Promise<ChatResult>;
  demandOutlook(input: {
    departmentName: string;
    periods: Array<{
      weekday: number;
      hour: number;
      fillRatio: number;
      level: string;
      score: number;
    }>;
  }): Promise<OutlookResult>;
};

export function createChatProvider(opts: {
  name: string;
  client: OpenAI;
  model: string;
  adminModel?: string;
}): ChatProvider {
  const { name, client, model, adminModel } = opts;

  return {
    name,

    async recommendSlots(input) {
      try {
        const completion = await client.chat.completions.create({
          model,
          response_format: { type: "json_object" },
          messages: buildRecommendMessages(input),
          temperature: 0.3,
        });

        const raw = completion.choices[0]?.message?.content;
        if (isBlank(raw)) {
          throw new Error(`${name} returned an empty completion`);
        }
        const parsed = JSON.parse(raw as string) as {
          summary?: string;
          recommendations?: Array<{
            slotId: string;
            rank: number;
            demandLevel: string;
            reason: string;
          }>;
        };

        return {
          ok: true,
          provider: name,
          model,
          summary: parsed.summary ?? "Recommended quieter slots based on demand.",
          recommendations: (parsed.recommendations ?? []).slice(0, 5),
        };
      } catch (err) {
        return {
          ok: false,
          provider: name,
          model,
          error: err instanceof Error ? err.message : `${name} request failed`,
        };
      }
    },

    async chatAssistant(input) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages: buildChatMessages(input),
          temperature: 0.5,
          max_tokens: 400,
        });

        const reply = completion.choices[0]?.message?.content?.trim();
        if (isBlank(reply)) {
          throw new Error(`${name} returned an empty completion`);
        }

        return { ok: true, provider: name, model, reply };
      } catch (err) {
        return {
          ok: false,
          provider: name,
          model,
          error: err instanceof Error ? err.message : `${name} request failed`,
        };
      }
    },

    async demandOutlook(input) {
      try {
        const completion = await client.chat.completions.create({
          model: adminModel || model,
          messages: buildOutlookMessages(input),
          temperature: 0.4,
          max_tokens: 350,
        });

        const outlook = completion.choices[0]?.message?.content?.trim();
        if (isBlank(outlook)) {
          throw new Error(`${name} returned an empty completion`);
        }

        return { ok: true, provider: name, model: adminModel || model, outlook };
      } catch (err) {
        return {
          ok: false,
          provider: name,
          model: adminModel || model,
          error: err instanceof Error ? err.message : `${name} request failed`,
        };
      }
    },
  };
}

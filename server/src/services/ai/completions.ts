import type { OpenAI } from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import {
  buildAgentMessages,
  buildBookingAdviceMessages,
  buildBusyHoursMessages,
  buildChatMessages,
  buildOutlookMessages,
  buildRecommendMessages,
  type BookingAdviceInput,
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

export type BusyHourPrediction = {
  weekday: number;
  hour: number;
  level: "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  reason: string;
};

export type BusyHoursResult = {
  ok: boolean;
  provider: string;
  model: string;
  summary?: string;
  busyHours?: BusyHourPrediction[];
  error?: string;
};

/** Patient-facing verdict on one exact booking time. */
export type BookingAdviceResult = {
  ok: boolean;
  provider: string;
  model: string;
  headline?: string;
  advice?: string;
  error?: string;
};

export type ToolExecutor = (
  name: string,
  argsJson: string,
) => Promise<{ result: unknown; sideEffect: boolean }>;

export type AgentToolCallLog = { name: string; args: string; result: unknown };

export type AgentResult = {
  ok: boolean;
  provider: string;
  model: string;
  reply?: string;
  toolCalls: AgentToolCallLog[];
  /** Once true, a fallback to a different provider would risk a duplicate action. */
  sideEffectOccurred: boolean;
  error?: string;
};

const MAX_AGENT_STEPS = 6;

function summarizeToolCalls(calls: AgentToolCallLog[]): string {
  const last = calls[calls.length - 1];
  if (!last) return "Done.";
  const r = last.result as Record<string, unknown>;
  if (r?.error) return `I couldn't finish that: ${r.error}`;
  if (r?.booked) return "Booked it — check your appointments for the details.";
  if (r?.cancelled) return "Cancelled that appointment.";
  if (r?.rescheduled) return "Rescheduled that appointment.";
  return "Done — action completed.";
}

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
  predictBusyHours(input: {
    departmentName: string;
    hospitalName?: string;
    periods: Array<{
      weekday: number;
      hour: number;
      fillRatio: number;
      level: string;
      score: number;
      slotCount: number;
    }>;
  }): Promise<BusyHoursResult>;
  bookingAdvice(input: BookingAdviceInput): Promise<BookingAdviceResult>;
  chatAgent(input: {
    message: string;
    departmentName?: string;
    context?: ChatDbContext;
    tools: ChatCompletionTool[];
    executeTool: ToolExecutor;
  }): Promise<AgentResult>;
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

    async predictBusyHours(input) {
      try {
        const completion = await client.chat.completions.create({
          model: adminModel || model,
          response_format: { type: "json_object" },
          messages: buildBusyHoursMessages(input),
          temperature: 0.25,
          max_tokens: 550,
        });

        const raw = completion.choices[0]?.message?.content;
        if (isBlank(raw)) {
          throw new Error(`${name} returned an empty completion`);
        }

        const parsed = JSON.parse(raw as string) as {
          summary?: string;
          busyHours?: BusyHourPrediction[];
        };

        return {
          ok: true,
          provider: name,
          model: adminModel || model,
          summary: parsed.summary ?? "Predicted busiest clinic windows from current demand.",
          busyHours: (parsed.busyHours ?? []).slice(0, 6),
        };
      } catch (err) {
        return {
          ok: false,
          provider: name,
          model: adminModel || model,
          error: err instanceof Error ? err.message : `${name} request failed`,
        };
      }
    },

    async bookingAdvice(input) {
      try {
        const completion = await client.chat.completions.create({
          model: adminModel || model,
          response_format: { type: "json_object" },
          messages: buildBookingAdviceMessages(input),
          temperature: 0.3,
          max_tokens: 400,
        });

        const raw = completion.choices[0]?.message?.content;
        if (isBlank(raw)) {
          throw new Error(`${name} returned an empty completion`);
        }

        const parsed = JSON.parse(raw as string) as {
          headline?: string;
          advice?: string;
        };

        return {
          ok: true,
          provider: name,
          model: adminModel || model,
          headline: parsed.headline,
          advice: parsed.advice,
        };
      } catch (err) {
        return {
          ok: false,
          provider: name,
          model: adminModel || model,
          error: err instanceof Error ? err.message : `${name} request failed`,
        };
      }
    },

    async chatAgent(input) {
      const messages: ChatCompletionMessageParam[] = buildAgentMessages(input);
      const toolCalls: AgentToolCallLog[] = [];
      let sideEffectOccurred = false;

      try {
        for (let step = 0; step < MAX_AGENT_STEPS; step++) {
          const completion = await client.chat.completions.create({
            model,
            messages,
            tools: input.tools,
            tool_choice: "auto",
            temperature: 0.3,
            max_tokens: 500,
          });

          const msg = completion.choices[0]?.message;
          if (!msg) throw new Error(`${name} returned no message`);

          const calls = (msg.tool_calls ?? []).filter((c) => c.type === "function");
          if (calls.length === 0) {
            const reply = msg.content?.trim();
            if (isBlank(reply)) {
              if (sideEffectOccurred) {
                return {
                  ok: true,
                  provider: name,
                  model,
                  reply: summarizeToolCalls(toolCalls),
                  toolCalls,
                  sideEffectOccurred,
                };
              }
              throw new Error(`${name} returned an empty completion`);
            }
            return { ok: true, provider: name, model, reply, toolCalls, sideEffectOccurred };
          }

          messages.push({
            role: "assistant",
            content: msg.content ?? null,
            tool_calls: calls,
          });

          for (const call of calls) {
            const { result, sideEffect } = await input.executeTool(
              call.function.name,
              call.function.arguments,
            );
            if (sideEffect) sideEffectOccurred = true;
            toolCalls.push({ name: call.function.name, args: call.function.arguments, result });
            messages.push({
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result),
            });
          }
        }

        if (sideEffectOccurred) {
          return {
            ok: true,
            provider: name,
            model,
            reply: summarizeToolCalls(toolCalls),
            toolCalls,
            sideEffectOccurred,
          };
        }
        throw new Error(`${name} did not finish within ${MAX_AGENT_STEPS} tool steps`);
      } catch (err) {
        return {
          ok: sideEffectOccurred,
          provider: name,
          model,
          reply: sideEffectOccurred ? summarizeToolCalls(toolCalls) : undefined,
          toolCalls,
          sideEffectOccurred,
          error: err instanceof Error ? err.message : `${name} request failed`,
        };
      }
    },
  };
}

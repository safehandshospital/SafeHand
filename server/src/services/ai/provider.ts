import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { agentrouterProvider } from "./agentrouter.js";
import { openaiProvider } from "./openai.js";
import type {
  AgentResult,
  BusyHoursResult,
  ChatProvider,
  ChatResult,
  BookingAdviceResult,
  OutlookResult,
  RecommendResult,
  ToolExecutor,
} from "./completions.js";
import type { BookingAdviceInput, ChatDbContext, SlotInput } from "./prompts.js";

// AgentRouter is the primary provider (free/pooled), OpenAI is the reliable fallback.
// See docs/agentrouter.md for why: AgentRouter can silently return empty completions
// or hit a shared daily quota, so every call here falls through to OpenAI on failure.
function providers(): ChatProvider[] {
  return [agentrouterProvider(), openaiProvider()].filter(
    (p): p is ChatProvider => p !== null,
  );
}

async function withFallback<T extends { ok: boolean; provider: string }>(
  run: (provider: ChatProvider) => Promise<T>,
): Promise<T | { ok: false; provider: "none"; model: string; error: string }> {
  const list = providers();
  if (list.length === 0) {
    return {
      ok: false,
      provider: "none",
      model: "none",
      error: "No AI provider configured (set AGENTROUTER_API_KEY or OPENAI_API_KEY)",
    };
  }

  let last: T | undefined;
  for (const provider of list) {
    const result = await run(provider);
    if (result.ok) return result;
    last = result;
  }
  return last as T;
}

export async function recommendSlots(input: {
  departmentName: string;
  preference?: string;
  slots: SlotInput[];
}): Promise<RecommendResult> {
  return withFallback((p) => p.recommendSlots(input)) as Promise<RecommendResult>;
}

export async function chatAssistant(input: {
  message: string;
  departmentName?: string;
  context?: ChatDbContext;
}): Promise<ChatResult> {
  return withFallback((p) => p.chatAssistant(input)) as Promise<ChatResult>;
}

export async function chatAssistantAgent(input: {
  message: string;
  departmentName?: string;
  context?: ChatDbContext;
  tools: ChatCompletionTool[];
  executeTool: ToolExecutor;
}): Promise<AgentResult> {
  const list = providers();
  if (list.length === 0) {
    return {
      ok: false,
      provider: "none",
      model: "none",
      toolCalls: [],
      sideEffectOccurred: false,
      error: "No AI provider configured (set AGENTROUTER_API_KEY or OPENAI_API_KEY)",
    };
  }

  let last: AgentResult | undefined;
  for (const provider of list) {
    const result = await provider.chatAgent(input);
    if (result.ok) return result;
    last = result;
    // A tool with a side effect (booking/cancel/reschedule) already ran on this
    // provider's turn — switching providers and replaying the conversation from
    // scratch could invoke it again, so stop instead of falling through.
    if (result.sideEffectOccurred) return result;
  }
  return last as AgentResult;
}

export async function demandOutlook(input: {
  departmentName: string;
  periods: Array<{
    weekday: number;
    hour: number;
    fillRatio: number;
    level: string;
    score: number;
  }>;
}): Promise<OutlookResult> {
  return withFallback((p) => p.demandOutlook(input)) as Promise<OutlookResult>;
}

export async function predictBusyHours(input: {
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
}): Promise<BusyHoursResult> {
  return withFallback((p) => p.predictBusyHours(input)) as Promise<BusyHoursResult>;
}


/**
 * Patient-facing advice for one exact booking time: is this usually busy here,
 * and which quieter windows nearby are a better choice?
 */
export async function bookingAdvice(input: BookingAdviceInput): Promise<BookingAdviceResult> {
  return withFallback((p) => p.bookingAdvice(input)) as Promise<BookingAdviceResult>;
}

import type { Memory } from "@/lib/memory";
import type {
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import {
  buildMemoryFallbackPrompt,
  tryParseMemoryFallbackJson,
  type MemoryInterpreterFallbackResponse,
} from "@/lib/app/memoryInterpreterFallbackHelpers";
import { buildMeaningfulConversationContext } from "@/lib/app/memoryInterpreterConversationContext";
import { reduceTopicAdjudication } from "@/lib/app/memoryInterpreterTopicReducer";
import { classifyMemoryUtterance } from "@/lib/app/memoryInterpreterUtterance";
import { normalizeText } from "@/lib/app/memoryInterpreterText";
import { normalizeTopicCandidate } from "@/lib/app/memoryInterpreterTopicExtractor";
import type { Message } from "@/types/chat";
import type { MemoryTopicAdjudication } from "@/lib/app/memoryTopicAdjudication";
import { normalizeTokenUsage, type TokenUsage } from "@/lib/app/gptMemoryStateHelpers";

export type MemoryFallbackResolution = {
  adjudication: MemoryTopicAdjudication;
  pendingCandidates: PendingMemoryRuleCandidate[];
  usedFallback: boolean;
  fallbackUsage: TokenUsage | null;
  fallbackUsageDetails: Record<string, unknown> | null;
  fallbackMetrics: {
    promptChars: number;
    rawReplyChars: number;
  } | null;
  debug?: {
    prompt: string;
    rawReply: string;
    parsed: MemoryInterpreterFallbackResponse | null;
    usageDetails: Record<string, unknown> | null;
  };
};

export function buildSafeFallbackFailureResult(
  currentMemory: Memory
): MemoryFallbackResolution {
  const currentTopic = normalizeText(currentMemory.context.currentTopic || "");
  if (!currentTopic) {
    return {
      adjudication: {},
      pendingCandidates: [],
      usedFallback: false,
      fallbackUsage: null,
      fallbackUsageDetails: null,
      fallbackMetrics: null,
    };
  }

  return {
    adjudication: {
      preserveExistingTopic: true,
      proposedTopic: undefined,
    },
    pendingCandidates: [],
    usedFallback: true,
    fallbackUsage: null,
    fallbackUsageDetails: null,
    fallbackMetrics: null,
  };
}

export function buildMemoryFallbackRequestInput(args: {
  latestUserText: string;
  recentMessages: Message[];
  currentMemory: Memory;
}) {
  const conversationContext = buildMeaningfulConversationContext(args.recentMessages);
  return buildMemoryFallbackPrompt({
    latestUserText: args.latestUserText,
    currentTopic: args.currentMemory.context.currentTopic,
    currentTask: args.currentMemory.context.currentTask,
    lastUserIntent: args.currentMemory.context.lastUserIntent,
    priorMeaningfulText: conversationContext.priorMeaningfulText,
    earlierMeaningfulText: conversationContext.earlierMeaningfulText,
  });
}

async function requestMemoryFallbackResponse(args: {
  latestUserText: string;
  recentMessages: Message[];
  currentMemory: Memory;
}): Promise<{
  prompt: string;
  rawReply: string;
  parsed: MemoryInterpreterFallbackResponse | null;
  usage: TokenUsage | null;
  usageDetails: Record<string, unknown> | null;
}> {
  const prompt = buildMemoryFallbackRequestInput(args);
  const res = await fetch("/api/chatgpt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "memory_interpret",
      input: prompt,
    }),
  });

  const data = await res.json();
  if (!res.ok || typeof data?.reply !== "string") {
    return {
      prompt,
      rawReply: typeof data?.reply === "string" ? data.reply : "",
      parsed: null,
      usage: normalizeTokenUsage(data?.usage),
      usageDetails:
        data?.usageDetails && typeof data.usageDetails === "object"
          ? (data.usageDetails as Record<string, unknown>)
          : null,
    };
  }

  return {
    prompt,
    rawReply: data.reply,
    parsed: tryParseMemoryFallbackJson(data.reply),
    usage: normalizeTokenUsage(data?.usage),
    usageDetails:
      data?.usageDetails && typeof data.usageDetails === "object"
        ? (data.usageDetails as Record<string, unknown>)
        : null,
  };
}

export async function resolveMemoryFallbackFlow(args: {
  latestUserText: string;
  recentMessages: Message[];
  currentMemory: Memory;
  settings: MemoryInterpreterSettings;
}): Promise<MemoryFallbackResolution> {
  try {
    const debugResponse = await requestMemoryFallbackResponse(args);
    if (!debugResponse.parsed) {
      return {
        ...buildSafeFallbackFailureResult(args.currentMemory),
        debug: debugResponse,
      };
    }
    const parsed = debugResponse.parsed;

    const utterance = classifyMemoryUtterance(
      args.latestUserText,
      args.currentMemory.context.currentTopic
    );
    const parsedDecision =
      parsed.decision === "keep" || parsed.decision === "switch" || parsed.decision === "unsure"
        ? parsed.decision
        : undefined;
    const proposedTopic =
      typeof parsed.proposedTopic === "string"
        ? normalizeTopicCandidate(parsed.proposedTopic)
        : parsed.topic && typeof parsed.topic === "string"
          ? normalizeTopicCandidate(parsed.topic)
          : "";

    if (!parsedDecision && !proposedTopic && args.currentMemory.context.currentTopic) {
      return buildSafeFallbackFailureResult(args.currentMemory);
    }

    const { adjudication, pendingCandidates } = reduceTopicAdjudication({
      latestUserText: args.latestUserText,
      utterance,
      parsed,
      saveRuleCandidates: args.settings.saveRuleCandidates,
    });

    return {
      adjudication,
      pendingCandidates,
      usedFallback: true,
      fallbackUsage: debugResponse.usage,
      fallbackUsageDetails: debugResponse.usageDetails,
      fallbackMetrics: {
        promptChars: debugResponse.prompt.length,
        rawReplyChars: debugResponse.rawReply.length,
      },
      debug: debugResponse,
    };
  } catch {
    return buildSafeFallbackFailureResult(args.currentMemory);
  }
}

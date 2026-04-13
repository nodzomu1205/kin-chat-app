import type { Memory } from "@/lib/memory";
import type {
  ApprovedMemoryRule,
  MemoryInterpreterSettings,
  PendingMemoryRuleCandidate,
} from "@/lib/memoryInterpreterRules";
import {
  buildTrackedEntities,
  extractFacts,
  extractPreferences,
  extractRecentSearchQueries,
  pruneFactsForTopic,
} from "@/lib/app/memoryInterpreterFacts";
import {
  resolveActiveDocumentFields,
  resolveWorksByEntityState,
} from "@/lib/app/memoryInterpreterWorks";
import {
  buildResolvedMemoryContext,
  resolveTopicFromInputs,
} from "@/lib/app/memoryInterpreterContext";
import {
  applyApprovedMemoryRule,
  buildMemoryFallbackPrompt,
  shouldUseMemoryFallback,
  tryParseMemoryFallbackJson,
  type MemoryInterpreterFallbackResponse,
} from "@/lib/app/memoryInterpreterFallbackHelpers";
import {
  isClosingReplyText,
  isSearchDirectiveText,
  looksLikeLongNarrativeText,
  normalizeText,
  normalizeTopicCandidate,
} from "@/lib/app/memoryInterpreterText";
import type { Message } from "@/types/chat";

export type MemoryInterpreterOptions = {
  topicSeed?: string;
  lastUserIntent?: string;
  activeDocument?: Record<string, unknown> | null;
  closingReplyOverride?: boolean;
  trackedEntityOverride?: string;
};

type ProvisionalContextInput = {
  currentMemory: Memory;
  inputText: string;
  currentTaskTitle?: string;
  activeDocumentTitle?: string;
  lastSearchQuery?: string;
};

type MemoryPatchInput = {
  currentMemory: Memory;
  recentMessages: Message[];
  options?: MemoryInterpreterOptions;
};

const LITERATURE_HINT_RE =
  /(?:文学|作家|作品|小説|戯曲|詩人|代表作|元帥|人物|歴史|チェーホフ|ドストエフスキー|トルストイ|プーシキン|ナポレオン)/u;

function isTopicSwitch(currentMemory: Memory, resolvedTopic: string | undefined) {
  const currentTopic = normalizeText(currentMemory.context.currentTopic || "");
  const nextTopic = normalizeText(resolvedTopic || "");
  if (!currentTopic || !nextTopic) return false;
  return currentTopic !== nextTopic;
}

export function interpretProvisionalMemoryContext(
  input: ProvisionalContextInput
): Memory["context"] {
  const {
    currentMemory,
    inputText,
    currentTaskTitle,
    activeDocumentTitle,
    lastSearchQuery,
  } = input;
  const resolvedTopic = resolveTopicFromInputs({
    inputText,
    lastSearchQuery,
    activeDocumentTitle,
    currentTaskTitle,
    existingTopic: currentMemory.context.currentTopic,
  });

  return buildResolvedMemoryContext({
    currentMemory,
    resolvedTopic,
    inputText,
  });
}

export function interpretMemoryPatch(input: MemoryPatchInput): Partial<Memory> {
  const { currentMemory, recentMessages, options } = input;
  const latestUserMessage =
    [...recentMessages].reverse().find((message) => message.role === "user") || null;
  const latestUserText = normalizeText(latestUserMessage?.text || "");
  const closingOnlyTurn =
    typeof options?.closingReplyOverride === "boolean"
      ? options.closingReplyOverride
      : Boolean(latestUserText) && isClosingReplyText(latestUserText);
  const recentSearchQueries = extractRecentSearchQueries(recentMessages);
  const latestPrompt =
    latestUserText && !isSearchDirectiveText(latestUserText) && !closingOnlyTurn
      ? latestUserText
      : "";

  const { activeDocument, activeDocumentTitle, activeDocumentExcerpt } =
    resolveActiveDocumentFields(currentMemory, options?.activeDocument);

  const resolvedTopic = resolveTopicFromInputs({
    inputText: latestPrompt,
    activeDocumentTitle,
    topicSeed: options?.topicSeed,
    existingTopic: currentMemory.context.currentTopic,
  });
  const topicSwitched = isTopicSwitch(currentMemory, resolvedTopic);

  const latestAssistantMessage =
    [...recentMessages].reverse().find((message) => message.role === "gpt") || null;
  const latestAssistantText = latestAssistantMessage?.text || "";
  const factSourceMessages =
    topicSwitched && latestAssistantMessage ? [latestAssistantMessage] : recentMessages;

  const worksAllowed =
    LITERATURE_HINT_RE.test(
      `${resolvedTopic || ""} ${activeDocumentTitle} ${latestAssistantText}`
    );
  const { tableWorksByEntity, worksByEntity } = resolveWorksByEntityState({
    currentMemory,
    resolvedTopic,
    topicSwitched,
    activeDocumentExcerpt,
    latestAssistantText,
    worksAllowed,
  });

  const lists: Record<string, unknown> = {};
  if (activeDocument) lists.activeDocument = activeDocument;
  if (recentSearchQueries.length > 0) lists.recentSearchQueries = recentSearchQueries;

  const trackedEntities = buildTrackedEntities(
    currentMemory,
    options?.trackedEntityOverride || resolvedTopic,
    tableWorksByEntity,
    topicSwitched
  );
  if (trackedEntities.length > 0) lists.trackedEntities = trackedEntities;
  if (worksByEntity && Object.keys(worksByEntity).length > 0) {
    lists.worksByEntity = worksByEntity;
  }

  return {
    facts:
      closingOnlyTurn && !topicSwitched
        ? currentMemory.facts
        : pruneFactsForTopic(currentMemory.facts, extractFacts(factSourceMessages), topicSwitched),
    preferences: extractPreferences(recentMessages),
    lists,
    context: buildResolvedMemoryContext({
      currentMemory,
      resolvedTopic,
      inputText: latestPrompt,
      lastUserIntentOverride:
        options?.lastUserIntent || latestPrompt || currentMemory.context.lastUserIntent,
    }),
  };
}


export async function resolveMemoryFallbackOptions(args: {
  latestUserText: string;
  currentMemory: Memory;
  settings: MemoryInterpreterSettings;
  approvedRules: ApprovedMemoryRule[];
}): Promise<{
  optionsPatch: Partial<MemoryInterpreterOptions>;
  pendingCandidates: PendingMemoryRuleCandidate[];
  usedFallback: boolean;
}> {
  const approvedPatch = applyApprovedMemoryRule(args.latestUserText, args.approvedRules);
  if (Object.keys(approvedPatch).length > 0) {
    return {
      optionsPatch: approvedPatch,
      pendingCandidates: [],
      usedFallback: false,
    };
  }

  if (!args.settings.llmFallbackEnabled || !shouldUseMemoryFallback(args.latestUserText)) {
    return { optionsPatch: {}, pendingCandidates: [], usedFallback: false };
  }

  try {
    const res = await fetch("/api/chatgpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "memory_interpret",
        input: buildMemoryFallbackPrompt({
          latestUserText: args.latestUserText,
          currentTopic: args.currentMemory.context.currentTopic,
          lastUserIntent: args.currentMemory.context.lastUserIntent,
        }),
      }),
    });

    const data = await res.json();
    if (!res.ok || typeof data?.reply !== "string") {
      return { optionsPatch: {}, pendingCandidates: [], usedFallback: false };
    }

    const parsed = tryParseMemoryFallbackJson(data.reply);
    if (!parsed) {
      return { optionsPatch: {}, pendingCandidates: [], usedFallback: false };
    }

    const optionsPatch: Partial<MemoryInterpreterOptions> = {};
    if (typeof parsed.isClosingReply === "boolean") {
      optionsPatch.closingReplyOverride = parsed.isClosingReply;
    }
    if (parsed.topic && typeof parsed.topic === "string") {
      optionsPatch.topicSeed = normalizeText(parsed.topic);
    }
    if (parsed.trackedEntity && typeof parsed.trackedEntity === "string") {
      optionsPatch.trackedEntityOverride = normalizeText(parsed.trackedEntity);
    }

    const pendingCandidates =
      Array.isArray(parsed.candidates) && args.settings.saveRuleCandidates
        ? parsed.candidates
            .map((candidate) => {
              const phrase =
                typeof candidate?.phrase === "string" ? normalizeText(candidate.phrase) : "";
              const kind =
                candidate?.kind === "topic_alias" || candidate?.kind === "closing_reply"
                  ? candidate.kind
                  : null;
              if (!phrase || !kind || !args.latestUserText.includes(phrase)) return null;
              return {
                id: `memcand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                phrase,
                kind,
                normalizedValue:
                  typeof candidate.normalizedValue === "string"
                    ? normalizeText(candidate.normalizedValue)
                    : undefined,
                createdAt: new Date().toISOString(),
                sourceText: args.latestUserText,
              } as PendingMemoryRuleCandidate;
            })
            .filter((item): item is PendingMemoryRuleCandidate => Boolean(item))
        : [];

    return {
      optionsPatch,
      pendingCandidates,
      usedFallback: true,
    };
  } catch {
    return { optionsPatch: {}, pendingCandidates: [], usedFallback: false };
  }
}

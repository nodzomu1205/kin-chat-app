import type { TaskCountRule, TaskIntent } from "@/types/taskProtocol";
import {
  buildTaskIntentFallbackPrompt,
  extractTaskIntentFallbackPayload,
  type TaskIntentFallbackCandidate,
  type TaskIntentFallbackPayload,
} from "@/lib/taskIntentFallback";
import {
  formatIntentCandidateDraftText,
  type IntentPhraseKind,
  type PendingIntentCandidate,
} from "@/lib/taskIntentPhraseState";
import type { ReasoningMode } from "@/lib/app/reasoningMode";

type UsageSummary = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

function buildIntentCandidateKey(candidate: {
  kind: IntentPhraseKind;
  phrase: string;
  count?: number;
  rule?: TaskCountRule;
  charLimit?: number;
}) {
  return [
    candidate.kind,
    candidate.phrase,
    candidate.count ?? "",
    candidate.rule ?? "",
    candidate.charLimit ?? "",
  ].join("::");
}

function toIntentPhraseKind(
  kind: TaskIntentFallbackCandidate["kind"]
): IntentPhraseKind {
  if (kind === "output_limit") return "char_limit";
  if (kind === "gpt_request") return "ask_gpt";
  if (kind === "search_request") return "search_request";
  if (kind === "youtube_transcript_request") return "youtube_transcript_request";
  if (kind === "ask_user") return "ask_user";
  return "library_reference";
}

export function buildPendingTaskIntentCandidates(args: {
  payload: TaskIntentFallbackPayload;
  sourceText: string;
}): PendingIntentCandidate[] {
  const seen = new Set<string>();
  const candidates: PendingIntentCandidate[] = [];

  for (const item of args.payload.candidates) {
    const phrase = typeof item.phrase === "string" ? item.phrase.trim() : "";
    if (!phrase) continue;

    const kind = toIntentPhraseKind(item.kind);
    const candidateRule =
      item.rule === "exact" ||
      item.rule === "at_least" ||
      item.rule === "up_to" ||
      item.rule === "around"
        ? item.rule
        : undefined;
    const count =
      kind === "char_limit"
        ? undefined
        : typeof item.count === "number" && item.count > 0
          ? Math.floor(item.count)
          : undefined;
    const charLimit =
      kind === "char_limit" &&
      typeof item.charLimit === "number" &&
      item.charLimit > 0
        ? Math.floor(item.charLimit)
        : undefined;

    const candidate: PendingIntentCandidate = {
      id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      phrase,
      kind,
      count,
      rule: candidateRule,
      charLimit,
      createdAt: new Date().toISOString(),
      sourceText: args.sourceText,
      draftText: formatIntentCandidateDraftText({
        kind: item.kind,
        count,
        rule: candidateRule,
        charLimit,
      }),
    };

    const key = buildIntentCandidateKey(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(candidate);
  }

  return candidates;
}

export async function requestTaskIntentFallback(args: {
  input: string;
  baseIntent: TaskIntent;
  reasoningMode?: ReasoningMode;
}): Promise<{
  payload: TaskIntentFallbackPayload | null;
  usage: UsageSummary | null;
}> {
  try {
    const res = await fetch("/api/chatgpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "chat",
        memory: null,
        recentMessages: [],
        input: buildTaskIntentFallbackPrompt(args.input, args.baseIntent),
        instructionMode: "normal",
        reasoningMode: args.reasoningMode === "creative" ? "creative" : "strict",
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        payload: null,
        usage: null,
      };
    }

    const reply = typeof data?.reply === "string" ? data.reply.trim() : "";
    return {
      payload: extractTaskIntentFallbackPayload(reply),
      usage: data?.usage ?? null,
    };
  } catch {
    return {
      payload: null,
      usage: null,
    };
  }
}

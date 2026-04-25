import type { TokenUsage } from "@/hooks/useGptMemory";

export type LibrarySummaryRequestBody = {
  title: string;
  text: string;
};

export type LibrarySummaryResponseData = {
  summary?: string;
  usage?: Partial<TokenUsage>;
  error?: string;
};

export function buildLibrarySummaryRequestBody(args: {
  title: string;
  text: string;
}): LibrarySummaryRequestBody {
  return {
    title: args.title,
    text: args.text,
  };
}

export function resolveLibrarySummaryResponseData(
  data: unknown
): LibrarySummaryResponseData {
  if (!data || typeof data !== "object") {
    return {};
  }

  const candidate = data as Record<string, unknown>;
  return {
    summary:
      typeof candidate.summary === "string" ? candidate.summary : undefined,
    usage:
      candidate.usage && typeof candidate.usage === "object"
        ? (candidate.usage as Partial<TokenUsage>)
        : undefined,
    error: typeof candidate.error === "string" ? candidate.error : undefined,
  };
}

export function buildLibrarySummaryErrorMessage(args: {
  data?: LibrarySummaryResponseData | null;
  fallback: string;
}) {
  return args.data?.error || args.fallback;
}

export function normalizeLibrarySummaryUsage(
  usage?: Partial<TokenUsage> | null
): TokenUsage | null {
  if (!usage) return null;
  return {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? 0,
  };
}

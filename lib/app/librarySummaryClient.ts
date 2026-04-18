import type { TokenUsage } from "@/hooks/useGptMemory";

export async function requestGeneratedLibrarySummary(args: {
  title: string;
  text: string;
}) {
  const response = await fetch("/api/library-summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  });

  const data = (await response.json().catch(() => ({}))) as {
    summary?: string;
    usage?: Partial<TokenUsage>;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || "Failed to generate import summary.");
  }

  return data;
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

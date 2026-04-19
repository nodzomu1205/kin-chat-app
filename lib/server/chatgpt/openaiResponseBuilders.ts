import type { UsageSummary } from "@/lib/server/chatgpt/openaiResponse";

type UsageLike = {
  usage?: object | null;
};

type ResponseTextLike = {
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
  output_text?: string;
};

export function buildUsageSummary(data: UsageLike): UsageSummary {
  const usage =
    data?.usage && typeof data.usage === "object"
      ? (data.usage as Record<string, unknown>)
      : undefined;
  const inputTokens =
    typeof usage?.input_tokens === "number" ? usage.input_tokens : 0;
  const outputTokens =
    typeof usage?.output_tokens === "number"
      ? usage.output_tokens
      : 0;
  const totalTokens =
    typeof usage?.total_tokens === "number"
      ? usage.total_tokens
      : inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

export function buildUsageDetails(data: UsageLike) {
  return data?.usage && typeof data.usage === "object" ? data.usage : null;
}

export function buildJsonObjectText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]?.trim()) {
    return fencedMatch[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

export function buildResponseText(
  data: ResponseTextLike,
  fallback = "GPT reply not found."
) {
  return data.output?.[0]?.content?.[0]?.text || data.output_text || fallback;
}

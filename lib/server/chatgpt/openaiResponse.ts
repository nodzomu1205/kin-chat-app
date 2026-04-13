export type UsageSummary = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export function extractUsage(data: any): UsageSummary {
  const inputTokens =
    typeof data?.usage?.input_tokens === "number" ? data.usage.input_tokens : 0;

  const outputTokens =
    typeof data?.usage?.output_tokens === "number"
      ? data.usage.output_tokens
      : 0;

  const totalTokens =
    typeof data?.usage?.total_tokens === "number"
      ? data.usage.total_tokens
      : inputTokens + outputTokens;

  return {
    inputTokens,
    outputTokens,
    totalTokens,
  };
}

export function extractJsonObjectText(value: string) {
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

export function extractResponseText(data: any, fallback = "GPT reply not found.") {
  return data.output?.[0]?.content?.[0]?.text || data.output_text || fallback;
}

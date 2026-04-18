export type UsageSummary = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};
import {
  buildJsonObjectText,
  buildResponseText,
  buildUsageSummary,
} from "@/lib/server/chatgpt/openaiResponseBuilders";

export function extractUsage(data: Parameters<typeof buildUsageSummary>[0]): UsageSummary {
  return buildUsageSummary(data);
}

export function extractJsonObjectText(value: string) {
  return buildJsonObjectText(value);
}

export function extractResponseText(
  data: Parameters<typeof buildResponseText>[0],
  fallback = "GPT reply not found."
) {
  return buildResponseText(data, fallback);
}

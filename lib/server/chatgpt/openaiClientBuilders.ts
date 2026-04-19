import {
  buildResponseText,
  buildUsageDetails,
  buildUsageSummary,
} from "@/lib/server/chatgpt/openaiResponseBuilders";
import type { UsageSummary } from "@/lib/server/chatgpt/openaiResponse";

export type OpenAIResponsesPayload = {
  model?: string;
  input: unknown;
};

export type OpenAIResponsesResult = {
  data: unknown;
  text: string;
  usage: UsageSummary;
  usageDetails: Record<string, unknown> | null;
};

export function buildOpenAIResponsesRequestBody(
  payload: OpenAIResponsesPayload,
  defaultModel: string
) {
  return {
    model: payload.model ?? defaultModel,
    input: payload.input,
  };
}

export function buildOpenAIResponsesResult(args: {
  data: unknown;
  fallbackText?: string;
}): OpenAIResponsesResult {
  return {
    data: args.data,
    text: buildResponseText(args.data as never, args.fallbackText),
    usage: buildUsageSummary(args.data as never),
    usageDetails: buildUsageDetails(args.data as never) as Record<string, unknown> | null,
  };
}

import {
  extractJsonObjectText,
  extractResponseText,
  extractUsage,
  type UsageSummary,
} from "@/lib/server/chatgpt/openaiResponse";

type OpenAIResponsesPayload = {
  model?: string;
  input: unknown;
};

type OpenAIResponsesResult = {
  data: unknown;
  text: string;
  usage: UsageSummary;
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o-mini";

export async function callOpenAIResponses(
  payload: OpenAIResponsesPayload,
  fallbackText = "GPT reply not found."
): Promise<OpenAIResponsesResult> {
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: payload.model ?? DEFAULT_MODEL,
      input: payload.input,
    }),
  });

  const data = await response.json();

  return {
    data,
    text: extractResponseText(data, fallbackText),
    usage: extractUsage(data),
  };
}

export function extractOpenAIJsonObjectText(
  text: string,
  fallback = "{}"
): string {
  return extractJsonObjectText(text || fallback);
}

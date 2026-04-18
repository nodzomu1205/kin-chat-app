import {
  extractJsonObjectText,
} from "@/lib/server/chatgpt/openaiResponse";
import {
  buildOpenAIResponsesRequestBody,
  buildOpenAIResponsesResult,
  type OpenAIResponsesPayload,
  type OpenAIResponsesResult,
} from "@/lib/server/chatgpt/openaiClientBuilders";

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
    body: JSON.stringify(
      buildOpenAIResponsesRequestBody(payload, DEFAULT_MODEL)
    ),
  });

  const data = await response.json();

  return buildOpenAIResponsesResult({
    data,
    fallbackText,
  });
}

export function extractOpenAIJsonObjectText(
  text: string,
  fallback = "{}"
): string {
  return extractJsonObjectText(text || fallback);
}

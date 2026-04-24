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

function resolveOpenAIErrorMessage(args: {
  data: unknown;
  status: number;
  statusText: string;
}) {
  const { data, status, statusText } = args;
  const fallback = `OpenAI request failed (${status} ${statusText || "unknown"})`;

  if (!data || typeof data !== "object") {
    return fallback;
  }

  const error = "error" in data ? data.error : null;
  if (!error) {
    return fallback;
  }

  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (typeof error === "object") {
    const message =
      "message" in error && typeof error.message === "string"
        ? error.message.trim()
        : "";
    const code =
      "code" in error && typeof error.code === "string"
        ? error.code.trim()
        : "";

    if (message && code) {
      return `${message} (${code})`;
    }
    if (message) {
      return message;
    }
  }

  return fallback;
}

export async function callOpenAIResponses(
  payload: OpenAIResponsesPayload,
  fallbackText = "GPT reply not found."
): Promise<OpenAIResponsesResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      buildOpenAIResponsesRequestBody(payload, DEFAULT_MODEL)
    ),
  });

  const rawText = await response.text();
  let data: unknown = {};

  if (rawText.trim()) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = {
        error: rawText.trim(),
      };
    }
  }

  if (!response.ok) {
    throw new Error(
      resolveOpenAIErrorMessage({
        data,
        status: response.status,
        statusText: response.statusText,
      })
    );
  }

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

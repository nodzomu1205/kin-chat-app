const OPENAI_EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

export type OpenAIEmbeddingUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type OpenAIEmbeddingResult = {
  embedding: number[];
  usage?: OpenAIEmbeddingUsage;
};

type OpenAIEmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
  usage?: {
    prompt_tokens?: number;
    total_tokens?: number;
  };
  error?: unknown;
};

export function resolveOpenAIEmbeddingModel() {
  return (
    process.env.OPENAI_EMBEDDING_MODEL?.trim() || DEFAULT_EMBEDDING_MODEL
  );
}

export async function createOpenAIEmbedding(input: string): Promise<number[]> {
  const result = await createOpenAIEmbeddingWithUsage(input);
  return result.embedding;
}

export async function createOpenAIEmbeddingWithUsage(
  input: string
): Promise<OpenAIEmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: resolveOpenAIEmbeddingModel(),
      input,
    }),
  });

  const rawText = await response.text();
  const data = parseEmbeddingResponse(rawText);

  if (!response.ok) {
    throw new Error(resolveEmbeddingErrorMessage(data, response));
  }

  const embedding = data.data?.[0]?.embedding;
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("OpenAI embedding response did not include an embedding.");
  }

  return {
    embedding,
    usage: normalizeEmbeddingUsage(data.usage),
  };
}

function parseEmbeddingResponse(rawText: string): OpenAIEmbeddingResponse {
  if (!rawText.trim()) return {};
  try {
    return JSON.parse(rawText) as OpenAIEmbeddingResponse;
  } catch {
    return { error: rawText.trim() };
  }
}

function resolveEmbeddingErrorMessage(
  data: OpenAIEmbeddingResponse,
  response: Response
) {
  const fallback = `OpenAI embedding request failed (${response.status} ${
    response.statusText || "unknown"
  })`;
  const error = data.error;
  if (!error) return fallback;
  if (typeof error === "string" && error.trim()) return error.trim();
  if (typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message || "").trim();
    if (message) return message;
  }
  return fallback;
}

function normalizeEmbeddingUsage(
  usage: OpenAIEmbeddingResponse["usage"]
): OpenAIEmbeddingUsage | undefined {
  if (!usage) return undefined;
  const inputTokens =
    typeof usage.prompt_tokens === "number" && Number.isFinite(usage.prompt_tokens)
      ? usage.prompt_tokens
      : 0;
  const totalTokens =
    typeof usage.total_tokens === "number" && Number.isFinite(usage.total_tokens)
      ? usage.total_tokens
      : inputTokens;
  if (inputTokens <= 0 && totalTokens <= 0) return undefined;
  return {
    inputTokens,
    outputTokens: 0,
    totalTokens,
  };
}

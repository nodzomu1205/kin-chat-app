export const KINDROID_TIMEOUT_MS = 90000;
export const KINDROID_API_URL = "https://api.kindroid.ai/v1/send-message";
export const KINDROID_FALLBACK_REPLY = "⚠️ 返答が見つかりません";

export type KindroidRequestBody = {
  message?: string;
  kinId?: string;
};

export type KindroidResponsePayload = {
  reply?: string;
  response?: string;
  text?: string;
  message?: string;
  messages?: Array<{ text?: string }>;
  data?: { text?: string };
};

export function buildKindroidRequestInit(args: {
  apiKey: string;
  kinId: string;
  message: string;
  signal: AbortSignal;
}): RequestInit {
  return {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      ai_id: args.kinId,
      message: args.message,
    }),
    signal: args.signal,
  };
}

export function extractKindroidReply(payload: KindroidResponsePayload) {
  return (
    payload.reply ??
    payload.response ??
    payload.text ??
    payload.message ??
    payload.messages?.[0]?.text ??
    payload.data?.text ??
    null
  );
}

export function buildKindroidSuccessPayload(text: string) {
  try {
    const data = JSON.parse(text) as KindroidResponsePayload;
    return {
      reply: extractKindroidReply(data) || KINDROID_FALLBACK_REPLY,
    };
  } catch {
    return { reply: text };
  }
}

import { generateId } from "@/lib/uuid";
import type { Message, SourceItem } from "@/types/chat";
import type { Dispatch, SetStateAction } from "react";

export function extractInlineUrlTarget(text: string) {
  if (!text) return "";
  const lines = text.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const match = line.match(/^URL\s*[:：]\s*(https?:\/\/\S+)$/i);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
}

export async function runInlineUrlShortcut(params: {
  rawText: string;
  inlineUrlTarget: string;
  setGptMessages: Dispatch<SetStateAction<Message[]>>;
  setGptInput: Dispatch<SetStateAction<string>>;
  setGptLoading: Dispatch<SetStateAction<boolean>>;
}) {
  const userMsg: Message = {
    id: generateId(),
    role: "user",
    text: params.rawText,
  };

  params.setGptMessages((prev) => [...prev, userMsg]);
  params.setGptInput("");
  params.setGptLoading(true);

  try {
    const response = await fetch(
      `/api/url-card?url=${encodeURIComponent(params.inlineUrlTarget)}`,
      { cache: "no-store" }
    );
    const data = (await response.json()) as {
      ok?: boolean;
      source?: SourceItem;
      error?: string;
    };

    if (!response.ok || !data.source) {
      throw new Error(data.error || "URL card resolve failed");
    }

    const resolvedSource = data.source as SourceItem;

    params.setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: "",
        sources: [resolvedSource],
        meta: {
          kind: "normal",
          sourceType: "manual",
        },
      },
    ]);
  } catch (error) {
    console.error(error);
    params.setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "gpt",
        text: "URL からカードを作成できませんでした。",
      },
    ]);
  } finally {
    params.setGptLoading(false);
  }
}

import { migrateLegacyProtocolLimits } from "@/lib/app/kinProtocolMigration";
import {
  KIN_PROTOCOL_PROMPT,
  KIN_PROTOCOL_RULEBOOK,
} from "@/lib/app/kinProtocolText";

export const DEFAULT_PROTOCOL_PROMPT = KIN_PROTOCOL_PROMPT;
export const DEFAULT_PROTOCOL_RULEBOOK = KIN_PROTOCOL_RULEBOOK;

export function normalizeProtocolRulebook(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_PROTOCOL_RULEBOOK;
  if (trimmed.startsWith("<<SYS_INFO>>")) return trimmed;

  return [
    "<<SYS_INFO>>",
    "TITLE: GPT protocol briefing",
    "CONTENT:",
    ...trimmed.split(/\r?\n/).map((line) => (line.trim() ? `- ${line.trim()}` : "")),
    "<<END_SYS_INFO>>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function getSavedProtocolDefaults(params: {
  promptDefaultKey: string;
  rulebookDefaultKey: string;
}) {
  if (typeof window === "undefined") {
    return {
      prompt: DEFAULT_PROTOCOL_PROMPT,
      rulebook: DEFAULT_PROTOCOL_RULEBOOK,
    };
  }

  const savedPrompt = window.localStorage.getItem(params.promptDefaultKey);
  const savedRulebook = window.localStorage.getItem(params.rulebookDefaultKey);

  return {
    prompt: savedPrompt
      ? migrateLegacyProtocolLimits(savedPrompt)
      : DEFAULT_PROTOCOL_PROMPT,
    rulebook: savedRulebook
      ? migrateLegacyProtocolLimits(savedRulebook)
      : DEFAULT_PROTOCOL_RULEBOOK,
  };
}

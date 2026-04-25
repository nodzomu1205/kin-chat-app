export type ReasoningMode = "strict" | "creative";

export function normalizeReasoningMode(value?: string): ReasoningMode {
  return value === "creative" ? "creative" : "strict";
}

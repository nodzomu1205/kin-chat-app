import type { PendingIntentCandidate } from "@/lib/taskIntent";

export const toTransformResponseMode = (
  mode: "strict" | "creative"
): "strict" | "creative" => {
  return mode;
};

export function getIntentCandidateSignature(candidate: {
  kind: string;
  phrase: string;
  count?: number;
  rule?: string;
  charLimit?: number;
}) {
  return [
    candidate.kind,
    candidate.phrase.trim(),
    candidate.count ?? "",
    candidate.rule ?? "",
    candidate.charLimit ?? "",
  ].join("|");
}

export function buildPendingIntentCandidateKey(
  candidate: Pick<PendingIntentCandidate, "kind" | "phrase" | "count" | "charLimit">
) {
  return `${candidate.kind}:${candidate.phrase}:${candidate.count ?? ""}:${candidate.charLimit ?? ""}`;
}

export function extractTaskGoalFromSysTaskBlock(text: string) {
  const match = text.match(
    /<<SYS_TASK>>[\s\S]*?GOAL:\s*([\s\S]*?)(?:\n[A-Z_]+:|\n(?:<<END_SYS_TASK>>|<<SYS_TASK_END>>))/
  );
  return match?.[1]?.trim() || "";
}

export function buildTaskRequestAnswerDraft(
  requestId: string,
  requestBody?: string | null
) {
  return `REQ ${requestId} への回答:\n${
    requestBody ? `対象質問: ${requestBody}\n` : ""
  }\nここに回答を記入してください。送信すると、GPT が <<SYS_USER_RESPONSE>> 形式へ整えます。`;
}

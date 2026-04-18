import type { UsageSummary } from "@/lib/server/chatgpt/openaiResponse";

export type LibrarySummaryRequest = {
  title?: string;
  text?: string;
};

export function resolveLibrarySummaryRequest(body: unknown) {
  const candidate =
    body && typeof body === "object" ? (body as LibrarySummaryRequest) : {};
  return {
    title: candidate.title?.trim() || "Imported document",
    text: candidate.text?.trim() || "",
  };
}

export function buildLibrarySummaryPrompt(args: { title: string; text: string }) {
  return [
    {
      role: "system" as const,
      content:
        "You write concise, faithful library summaries. Summarize the whole document, not just the beginning. Return summary text only, in the same language as the document when possible. Aim for 2-4 sentences and keep it clearly shorter than the source.",
    },
    {
      role: "user" as const,
      content: `TITLE:\n${args.title}\n\nDOCUMENT:\n${args.text}`,
    },
  ];
}

export function buildLibrarySummarySuccessResponse(args: {
  summary: string;
  usage: UsageSummary;
}) {
  return {
    summary: args.summary.trim(),
    usage: args.usage,
  };
}

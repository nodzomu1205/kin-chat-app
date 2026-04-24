import { callOpenAIResponses } from "@/lib/server/chatgpt/openaiClient";
import { buildLibrarySummaryPrompt } from "@/lib/server/librarySummary/routeBuilders";

export async function generateLibrarySummary(args: {
  title: string;
  text: string;
}) {
  return callOpenAIResponses(
    {
      model: "gpt-4o-mini",
      input: buildLibrarySummaryPrompt(args),
    },
    "Summary could not be generated."
  );
}

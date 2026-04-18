import {
  buildLibrarySummaryErrorMessage,
  buildLibrarySummaryRequestBody,
  resolveLibrarySummaryResponseData,
} from "@/lib/app/librarySummaryClientBuilders";

export async function requestGeneratedLibrarySummary(args: {
  title: string;
  text: string;
}) {
  const response = await fetch("/api/library-summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildLibrarySummaryRequestBody(args)),
  });

  const data = resolveLibrarySummaryResponseData(
    await response.json().catch(() => ({}))
  );

  if (!response.ok) {
    throw new Error(
      buildLibrarySummaryErrorMessage({
        data,
        fallback: "Failed to generate import summary.",
      })
    );
  }

  return data;
}
export { normalizeLibrarySummaryUsage } from "@/lib/app/librarySummaryClientBuilders";

import { normalizeUsage } from "@/lib/shared/tokenStats";
import { normalizeLibrarySummaryUsage } from "@/lib/app/reference-library/librarySummaryClient";

export function normalizeLibrarySummaryIngestUsage(
  usage: Parameters<typeof normalizeLibrarySummaryUsage>[0]
) {
  return normalizeUsage(normalizeLibrarySummaryUsage(usage));
}

import type { TaskProtocolEvent, TaskRequirementProgress } from "@/types/taskProtocol";

export function isSuccessfulTaskArtifact(event: TaskProtocolEvent) {
  switch (event.type) {
    case "gpt_response":
      return !!event.body?.trim();
    case "search_response":
      return !!(event.rawResultId || event.summary || event.body);
    case "youtube_transcript_response":
      return !!event.libraryItemId;
    case "library_index_response":
    case "library_item_response":
    case "library_image_data_response":
      return !!(event.body || event.summary);
    case "ppt_design_response":
      return !!(event.body || event.summary);
    default:
      return false;
  }
}

export function isRequirementProgressAtLimit(
  requirement:
    | Pick<TaskRequirementProgress, "targetCount" | "completedCount">
    | undefined
) {
  if (!requirement || typeof requirement.targetCount !== "number") return false;
  return (requirement.completedCount ?? 0) >= requirement.targetCount;
}

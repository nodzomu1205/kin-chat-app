import { describe, expect, it } from "vitest";
import {
  isRequirementProgressAtLimit,
  isSuccessfulTaskArtifact,
} from "@/lib/task/taskProgressPolicy";
import type { TaskProtocolEvent } from "@/types/taskProtocol";

function createEvent(
  overrides: Partial<TaskProtocolEvent> & Pick<TaskProtocolEvent, "type">
): TaskProtocolEvent {
  return {
    type: overrides.type,
    body: overrides.body ?? "",
    taskId: overrides.taskId,
    actionId: overrides.actionId,
    status: overrides.status,
    required: overrides.required,
    summary: overrides.summary,
    query: overrides.query,
    url: overrides.url,
    searchEngine: overrides.searchEngine,
    searchLocation: overrides.searchLocation,
    outputMode: overrides.outputMode,
    rawResultId: overrides.rawResultId,
    libraryItemId: overrides.libraryItemId,
    partIndex: overrides.partIndex,
    totalParts: overrides.totalParts,
    characters: overrides.characters,
  };
}

describe("taskProgressPolicy", () => {
  it("treats gpt_response with non-empty body as successful", () => {
    expect(
      isSuccessfulTaskArtifact(
        createEvent({ type: "gpt_response", body: "Noted." })
      )
    ).toBe(true);
  });

  it("treats empty gpt_response as unsuccessful", () => {
    expect(
      isSuccessfulTaskArtifact(createEvent({ type: "gpt_response", body: "   " }))
    ).toBe(false);
  });

  it("treats search_response with summary as successful", () => {
    expect(
      isSuccessfulTaskArtifact(
        createEvent({ type: "search_response", body: "", summary: "digest" })
      )
    ).toBe(true);
  });

  it("treats youtube_transcript_response without library item as unsuccessful", () => {
    expect(
      isSuccessfulTaskArtifact(
        createEvent({ type: "youtube_transcript_response", body: "ok" })
      )
    ).toBe(false);
  });

  it("detects requirement limits only when targetCount is reached", () => {
    expect(
      isRequirementProgressAtLimit({ completedCount: 2, targetCount: 3 })
    ).toBe(false);
    expect(
      isRequirementProgressAtLimit({ completedCount: 3, targetCount: 3 })
    ).toBe(true);
  });

  it("does not treat missing targetCount as over limit", () => {
    expect(isRequirementProgressAtLimit(undefined)).toBe(false);
    expect(isRequirementProgressAtLimit({ completedCount: 5 })).toBe(false);
  });
});

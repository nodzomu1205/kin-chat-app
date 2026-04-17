import { describe, expect, it } from "vitest";
import {
  buildGptTaskPrepSource,
  buildLatestGptTaskSource,
  buildGptTaskUpdateSource,
  resolveTaskTitleFromResult,
} from "@/lib/app/taskDraftFlowResolvers";

describe("taskDraftFlowResolvers", () => {
  it("keeps explicit titles when resolving titles from result text", () => {
    const title = resolveTaskTitleFromResult({
      explicitTitle: "Explicit title",
      currentTitle: "Current title",
      currentTaskName: "Current title",
      resultText: "Updated body",
      fallback: "Fallback title",
      getResolvedTaskTitle: ({ explicitTitle, fallback }) =>
        explicitTitle || fallback || "Task",
    });

    expect(title).toBe("Explicit title");
  });

  it("builds named GPT task sources with stable labels", () => {
    expect(buildGptTaskPrepSource("prep").label).toBe("GPT task prep");
    expect(buildGptTaskUpdateSource("update").label).toBe("GPT task update");
  });

  it("includes direction text when building latest GPT task sources", () => {
    const source = buildLatestGptTaskSource({
      directionInstruction: "Focus on growth",
      latestGptText: "Latest answer",
    });

    expect(source.label).toBe("Latest GPT message");
    expect(source.content).toContain("Focus on growth");
    expect(source.content).toContain("Latest answer");
  });
});

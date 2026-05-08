import { describe, expect, it } from "vitest";
import {
  buildPortablePresentationPlanStoredDocument,
  buildPresentationPlanSidecarFileName,
  buildPresentationPlanSidecarText,
  parsePresentationPlanSidecarText,
} from "@/lib/app/presentation/presentationPlanPortable";

const plan = {
  version: "0.1-presentation-task-plan",
  documentId: "ppt_portable",
  title: "Portable PPT",
  slides: [],
} as unknown as import("@/types/task").PresentationTaskPlan;

describe("presentationPlanPortable", () => {
  it("round-trips presentation plan sidecar JSON", () => {
    const text = buildPresentationPlanSidecarText({
      title: "Portable PPT",
      filename: "Portable PPT.txt",
      summary: "Existing summary",
      plan,
      exportedAt: "2026-05-08T00:00:00.000Z",
    });

    expect(parsePresentationPlanSidecarText(text)).toMatchObject({
      title: "Portable PPT",
      filename: "Portable PPT.txt",
      summary: "Existing summary",
      plan,
    });
  });

  it("uses a stable sidecar filename next to the text export", () => {
    expect(
      buildPresentationPlanSidecarFileName({
        filename: "Portable PPT.txt",
      })
    ).toBe("Portable PPT.presentation-plan.json");
  });

  it("builds an ingested presentation plan record without changing the plan", () => {
    const document = buildPortablePresentationPlanStoredDocument({
      title: "Portable PPT",
      filename: "Portable PPT.txt",
      text: "PPT text",
      summary: "Existing summary",
      plan,
      timestamp: "2026-05-08T00:00:00.000Z",
    });

    expect(document).toMatchObject({
      artifactType: "presentation_plan",
      title: "Portable PPT",
      filename: "Portable PPT.txt",
      text: "PPT text",
      summary: "Existing summary",
      structuredPayload: plan,
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-08T00:00:00.000Z",
    });
  });
});

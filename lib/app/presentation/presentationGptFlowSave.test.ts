import { describe, expect, it, vi } from "vitest";
import { runPresentationGptCommandFlow } from "@/lib/app/presentation/presentationGptFlow";
import {
  buildFlowArgs,
  buildPresentationPlanLibraryItem,
  buildRecentDesign,
} from "@/lib/app/presentation/presentationGptFlowTestHelpers";
import type { Message } from "@/types/chat";

describe("runPresentationGptCommandFlow save commands", () => {
  it("saves a recent unsaved PPT design by Document ID", async () => {
    const design = buildRecentDesign("ppt_recent_save");
    const recordIngestedDocument = vi.fn(() => ({ id: "stored-save" }));
    const messages: Message[] = [];

    const handled = await runPresentationGptCommandFlow({
      rawText: "/ppt\nDocument ID: ppt_recent_save\nSave",
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [
          { id: "g1", role: "gpt", text: design.text, meta: { presentationPlan: design.plan } },
        ],
        recordIngestedDocument,
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: "presentation_plan",
        filename: "ppt_recent_save.txt",
        text: expect.stringContaining("Document ID: ppt_recent_save"),
        structuredPayload: expect.objectContaining({
          documentId: "ppt_recent_save",
        }),
      })
    );
    expect(messages.at(-1)?.text).toContain("Presentation design is saved in the library.");
  });

  it("updates an existing library card when saving a PPT design again", async () => {
    const oldDesign = buildRecentDesign("ppt_existing_save", {
      visualLabel: "Old label",
    });
    const newDesign = buildRecentDesign("ppt_existing_save", {
      visualLabel: "New label",
    });
    const recordIngestedDocument = vi.fn(() => ({ id: "should-not-create" }));
    const updateStoredDocument = vi.fn();
    const messages: Message[] = [];

    const handled = await runPresentationGptCommandFlow({
      rawText: "/ppt\nDocument ID: ppt_existing_save\nSave",
      flowArgs: buildFlowArgs({
        messages,
        recentMessages: [
          {
            id: "g1",
            role: "gpt",
            text: newDesign.text,
            meta: { presentationPlan: newDesign.plan },
          },
        ],
        recordIngestedDocument,
        updateStoredDocument,
        referenceLibraryItems: [buildPresentationPlanLibraryItem(oldDesign.plan)],
      }),
      assistantRequestArgs: {} as never,
    });

    expect(handled).toBe(true);
    expect(recordIngestedDocument).not.toHaveBeenCalled();
    expect(updateStoredDocument).toHaveBeenCalledWith(
      "stored-ppt_existing_save",
      expect.objectContaining({
        text: expect.stringContaining("New label"),
        structuredPayload: expect.objectContaining({
          documentId: "ppt_existing_save",
        }),
      })
    );
    expect(messages.at(-1)?.text).toContain("Presentation design is saved in the library.");
  });
});

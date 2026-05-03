import { describe, expect, it, vi } from "vitest";
import {
  buildPptDirectEditTargetSummary,
  loadPendingPptDirectEditCandidates,
  materializePptDirectEditCandidate,
  savePendingPptDirectEditCandidate,
  type PptDirectEditCandidate,
} from "@/lib/app/presentation/presentationDirectEditApproval";

function createStorage() {
  const data = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
    clear: vi.fn(() => data.clear()),
    key: vi.fn((index: number) => Array.from(data.keys())[index] ?? null),
    get length() {
      return data.size;
    },
  } as Storage;
}

function createCandidate(): PptDirectEditCandidate {
  return {
    id: "candidate-1",
    documentId: "ppt_1",
    instruction: "Revise slide 1",
    planText: "long formatted plan",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    plan: {
      version: "0.1-presentation-task-plan",
      documentId: "ppt_1",
      title: "Deck",
      sourceSummary: "",
      extractedItems: [],
      strategyItems: [],
      keyMessages: [],
      slideItems: [],
      slideFrames: [],
      slides: [],
      missingInfo: [],
      nextSuggestions: [],
      latestPptx: {
        filename: "deck.pptx",
        path: "blob:large",
        createdAt: "2026-01-01T00:00:00.000Z",
        slideCount: 1,
      },
      debug: {
        slideSource: "none",
        slideJsonRaw: ["large debug"],
        slideJsonParsed: false,
        slideCount: 0,
        generatedAt: "2026-01-01T00:00:00.000Z",
      },
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  };
}

describe("presentationDirectEditApproval", () => {
  it("stores pending direct edit candidates without render output caches", () => {
    const storage = createStorage();

    savePendingPptDirectEditCandidate({
      storage,
      candidate: createCandidate(),
    });

    const [candidate] = loadPendingPptDirectEditCandidates(storage);
    expect(candidate.planText).toBe("");
    expect(candidate.plan.latestPptx).toBeUndefined();
    expect(candidate.plan.debug).toBeUndefined();
  });

  it("summarizes structured edit targets for approval review", () => {
    expect(
      buildPptDirectEditTargetSummary([
        {
          slideNumber: 1,
          blockNumber: 2,
        },
      ])
    ).toBe("Slide 1 / Block 2");
  });

  it("materializes structured text edits into the target block", () => {
    const candidate = createCandidate();
    candidate.edits = [
      {
        id: "edit-1",
        slideNumber: 1,
        blockNumber: 1,
        blockId: "block-1",
        blockType: "text",
        blockKind: "textStack",
        instruction: "detail",
        currentText: "Before",
        proposedText: "After A\nAfter B",
        visualMode: "none",
        accepted: true,
      },
    ];
    candidate.plan.slideFrames = [
      {
        slideNumber: 1,
        title: "Slide 1",
        masterFrameId: "plain",
        layoutFrameId: "singleCenter",
        blocks: [
          {
            id: "block-1",
            kind: "textStack",
            styleId: "textStackTopLeft",
            text: "Before",
            items: ["old item"],
          },
        ],
      },
    ];

    const materialized = materializePptDirectEditCandidate(candidate);

    expect(materialized.plan.slideFrames[0]?.blocks[0]).toMatchObject({
      text: "After A\nAfter B",
    });
    expect(materialized.plan.slideFrames[0]?.blocks[0]?.items).toBeUndefined();
  });

  it("materializes structured list edits by replacing text with items", () => {
    const candidate = createCandidate();
    candidate.edits = [
      {
        id: "edit-1",
        slideNumber: 1,
        blockNumber: 1,
        blockId: "block-1",
        blockType: "text",
        blockKind: "list",
        instruction: "split",
        currentText: "Before",
        proposedText: "- After A\n- After B",
        visualMode: "none",
        accepted: true,
      },
    ];
    candidate.plan.slideFrames = [
      {
        slideNumber: 1,
        title: "Slide 1",
        masterFrameId: "plain",
        layoutFrameId: "singleCenter",
        blocks: [
          {
            id: "block-1",
            kind: "list",
            styleId: "listCompact",
            text: "Before",
            items: ["old item"],
          },
        ],
      },
    ];

    const materialized = materializePptDirectEditCandidate(candidate);

    expect(materialized.plan.slideFrames[0]?.blocks[0]).toMatchObject({
      items: ["After A", "After B"],
    });
    expect(materialized.plan.slideFrames[0]?.blocks[0]?.text).toBeUndefined();
  });

  it("materializes structured visual edits into visualRequest", () => {
    const candidate = createCandidate();
    candidate.edits = [
      {
        id: "edit-1",
        slideNumber: 1,
        blockNumber: 1,
        blockId: "block-1",
        blockType: "visual",
        blockKind: "visual",
        instruction: "replace image",
        currentText: "Old visual",
        proposedText: "",
        visualMode: "library_image",
        imageId: "img_supply_chain",
        visualBrief: "Cotton supply chain map",
        generationPrompt: "",
        accepted: true,
      },
    ];
    candidate.plan.slideFrames = [
      {
        slideNumber: 1,
        title: "Slide 1",
        masterFrameId: "plain",
        layoutFrameId: "singleCenter",
        blocks: [
          {
            id: "block-1",
            kind: "visual",
            styleId: "visualContain",
            visualRequest: {
              type: "diagram",
              brief: "Old visual",
              prompt: "Old prompt",
            },
          },
        ],
      },
    ];

    const materialized = materializePptDirectEditCandidate(candidate);

    expect(
      materialized.plan.slideFrames[0]?.blocks[0]?.visualRequest
    ).toMatchObject({
      brief: "Cotton supply chain map",
      prompt: "Old prompt",
      preferredImageId: "img_supply_chain",
    });
  });
});

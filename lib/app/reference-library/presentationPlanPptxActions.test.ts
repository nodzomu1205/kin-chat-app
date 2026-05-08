import { describe, expect, it, vi } from "vitest";
import {
  renderLibraryPresentationPlanPptx,
  resolvePresentationPlanFromLibraryItem,
} from "@/lib/app/reference-library/presentationPlanPptxActions";
import type { ReferenceLibraryItem } from "@/types/chat";
import type { PresentationTaskPlan } from "@/types/task";

vi.mock("@/lib/app/image/imageAssetStorage", () => ({
  loadGeneratedImageAsset: vi.fn(async (imageId: string) => ({
    imageId,
    mimeType: "image/png",
    base64: "base64-image",
  })),
}));

const renderablePlan: PresentationTaskPlan = {
  version: "0.1-presentation-task-plan",
  documentId: "ppt_plan",
  title: "Cotton deck",
  sourceSummary: "Cotton summary",
  extractedItems: [],
  strategyItems: [],
  keyMessages: [],
  slideItems: [],
  deckFrame: undefined,
  slideFrames: [
    {
      slideNumber: 1,
      title: "Cotton overview",
      masterFrameId: "titleLineFooter",
      layoutFrameId: "titleBody",
      blocks: [
        {
          id: "block1",
          kind: "list",
          styleId: "listCompact",
          items: ["India", "China"],
        },
      ],
    },
  ],
  slides: [],
  missingInfo: [],
  nextSuggestions: [],
  latestPptx: null,
  updatedAt: "2026-05-08T00:00:00.000Z",
};

function createItem(overrides: Partial<ReferenceLibraryItem> = {}): ReferenceLibraryItem {
  return {
    id: "doc:ppt-plan",
    sourceId: "ingest:ppt plan",
    itemType: "ingested_file",
    artifactType: "presentation_plan",
    title: "Cotton deck",
    subtitle: "PPT Design / Cotton deck.txt",
    summary: "Existing summary",
    excerptText: "PPT plan text",
    createdAt: "2026-05-08T00:00:00.000Z",
    updatedAt: "2026-05-08T00:00:00.000Z",
    filename: "Cotton deck.txt",
    structuredPayload: renderablePlan,
    ...overrides,
  };
}

describe("presentationPlanPptxActions", () => {
  it("resolves stored presentation plans from library items", () => {
    expect(resolvePresentationPlanFromLibraryItem(createItem())).toBe(renderablePlan);
    expect(
      resolvePresentationPlanFromLibraryItem(createItem({ artifactType: undefined }))
    ).toBeNull();
  });

  it("renders a library presentation plan and builds the stored-document patch", async () => {
    const renderPptx = vi.fn(async () => ({
      id: "pptx_1",
      format: "pptx" as const,
      filename: "Cotton deck.pptx",
      path: "blob:pptx",
      createdAt: "2026-05-08T01:00:00.000Z",
      slideCount: 1,
      generatedImages: [],
      frameSpec: undefined,
    }));

    const result = await renderLibraryPresentationPlanPptx({
      item: createItem(),
      libraryItems: [],
      renderPptx,
      now: () => "2026-05-08T02:00:00.000Z",
    });

    expect(renderPptx).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: "ingest_ppt_plan",
        generateImages: false,
        imageMode: undefined,
        libraryImageAssets: [],
      })
    );
    expect(result).toMatchObject({
      status: "rendered",
      sourceId: "ingest:ppt plan",
      messageText: expect.stringContaining("PPTX: [Cotton deck.pptx](blob:pptx)"),
      patch: {
        summary: "Existing summary",
        structuredPayload: {
          latestPptx: {
            filename: "Cotton deck.pptx",
            path: "blob:pptx",
            createdAt: "2026-05-08T01:00:00.000Z",
            slideCount: 1,
          },
          updatedAt: "2026-05-08T02:00:00.000Z",
        },
      },
    });
  });

  it("hydrates selected library images for PPTX rendering", async () => {
    const selectedPlan: PresentationTaskPlan = {
      ...renderablePlan,
      slideFrames: renderablePlan.slideFrames.map((frame) => ({
        ...frame,
        blocks: frame.blocks.map((block) => ({
          ...block,
          visualRequest: {
            type: "photo",
            brief: "Selected cotton field",
            preferredImageId: "img_selected",
          },
        })),
      })),
    };
    const renderPptx = vi.fn(async () => ({
      id: "pptx_1",
      format: "pptx" as const,
      filename: "Cotton deck.pptx",
      path: "blob:pptx",
      createdAt: "2026-05-08T01:00:00.000Z",
      slideCount: 1,
      generatedImages: [],
      frameSpec: undefined,
    }));

    await renderLibraryPresentationPlanPptx({
      item: createItem({ structuredPayload: selectedPlan }),
      libraryItems: [
        {
          id: "doc:img_selected",
          sourceId: "img_selected",
          itemType: "kin_created",
          artifactType: "generated_image",
          title: "Selected image",
          subtitle: "Image ID: img_selected",
          summary: "Selected image",
          excerptText: "Image ID: img_selected",
          createdAt: "2026-05-08T00:00:00.000Z",
          updatedAt: "2026-05-08T00:00:00.000Z",
          structuredPayload: {
            version: "0.1-generated-image",
            imageId: "img_selected",
            mimeType: "image/png",
            prompt: "Cotton field",
            createdAt: "2026-05-08T00:00:00.000Z",
          },
        },
      ],
      renderPptx,
    });

    expect(renderPptx).toHaveBeenCalledWith(
      expect.objectContaining({
        generateImages: true,
        imageMode: "library",
        libraryImageAssets: [
          expect.objectContaining({
            imageId: "img_selected",
            base64: "base64-image",
          }),
        ],
      })
    );
  });

  it("reports non-renderable presentation plans without calling render", async () => {
    const renderPptx = vi.fn();
    const result = await renderLibraryPresentationPlanPptx({
      item: createItem({
        structuredPayload: {
          ...renderablePlan,
          slideFrames: [],
        },
      }),
      libraryItems: [],
      renderPptx,
    });

    expect(result).toEqual({ status: "not_renderable" });
    expect(renderPptx).not.toHaveBeenCalled();
  });
});

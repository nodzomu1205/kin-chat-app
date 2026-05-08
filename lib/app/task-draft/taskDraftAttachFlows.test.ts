import { describe, expect, it, vi } from "vitest";
import { runAttachSearchResultToTaskFlow } from "@/lib/app/task-draft/taskDraftAttachFlows";
import { createEmptyMemory } from "@/lib/memory-domain/memory";
import type { Message, ReferenceLibraryItem } from "@/types/chat";
import type { PresentationTaskPlan, TaskDraft } from "@/types/task";

const { runAutoPrepPresentationTaskMock } = vi.hoisted(() => ({
  runAutoPrepPresentationTaskMock: vi.fn(),
}));

vi.mock("@/lib/app/gpt-task/gptTaskClient", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/app/gpt-task/gptTaskClient")>();
  return {
    ...actual,
    runAutoPrepPresentationTask: runAutoPrepPresentationTaskMock,
  };
});

const plan: PresentationTaskPlan = {
  version: "0.1-presentation-task-plan",
  documentId: "ppt_saved",
  title: "Saved deck",
  sourceSummary: "",
  extractedItems: [],
  strategyItems: [],
  keyMessages: [],
  slideItems: [],
  deckFrame: undefined,
  slideFrames: [
    {
      slideNumber: 1,
      title: "Slide",
      masterFrameId: "titleLineFooter",
      layoutFrameId: "titleBody",
      blocks: [
        {
          id: "block1",
          kind: "list",
          styleId: "listCompact",
          items: ["Point"],
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

describe("runAttachSearchResultToTaskFlow", () => {
  it("imports presentation plan library items directly without regenerating slideFrames", async () => {
    const messages: Message[] = [];
    let draft: TaskDraft = {
      id: "draft-1",
      mode: "normal",
      title: "",
      taskName: "",
      body: "",
      prepText: "",
      objective: "",
      userInstruction: "",
      slot: 1,
      taskId: "",
      searchContext: null,
      deepenText: "",
      mergedText: "",
      kinTaskText: "",
      status: "idle",
      updatedAt: "",
      sources: [],
    };
    const setGptLoading = vi.fn();

    await runAttachSearchResultToTaskFlow({
      ...buildFlowArgs({
        messages,
        setGptLoading,
        getCurrentDraft: () => draft,
        setDraft: (next) => {
          draft = next;
        },
      }),
      gptInput: "/ppt",
      getTaskLibraryItem: () => ({
        id: "doc:ppt_saved",
        sourceId: "stored-ppt",
        itemType: "ingested_file",
        artifactType: "presentation_plan",
        title: "Saved deck",
        subtitle: "Document ID: ppt_saved",
        summary: "Summary",
        excerptText: "projection text",
        createdAt: "2026-05-08T00:00:00.000Z",
        updatedAt: "2026-05-08T00:00:00.000Z",
        structuredPayload: plan,
      } as ReferenceLibraryItem),
    });

    expect(runAutoPrepPresentationTaskMock).not.toHaveBeenCalled();
    expect(messages.at(-1)?.text).toContain(
      "Library item imported into a new PPT design task."
    );
    expect(draft.mode).toBe("presentation");
    expect(draft.presentationPlan).not.toBe(plan);
    expect(draft.presentationPlan?.documentId).toMatch(/^ppt_/);
    expect(draft.presentationPlan?.documentId).not.toBe("ppt_saved");
    expect(draft.body).toContain(`Document ID: ${draft.presentationPlan?.documentId}`);
    expect(draft.body).not.toContain("Document ID: ppt_saved");
    expect(setGptLoading).toHaveBeenNthCalledWith(1, true);
    expect(setGptLoading).toHaveBeenLastCalledWith(false);
  });
});

function buildFlowArgs(args: {
  messages: Message[];
  setGptLoading?: (value: boolean) => void;
  getCurrentDraft: () => TaskDraft;
  setDraft: (next: TaskDraft) => void;
}) {
  return {
    gptLoading: false,
    get currentTaskDraft() {
      return args.getCurrentDraft();
    },
    getTaskBaseText: () => "",
    getTaskSearchContext: () => null,
    applyPrefixedTaskFieldsFromText: () => ({}),
    getResolvedTaskTitle: () => "Saved deck",
    setGptMessages: (updater: (prev: Message[]) => Message[]) => {
      args.messages.splice(0, args.messages.length, ...updater(args.messages));
    },
    setGptInput: vi.fn(),
    setGptLoading: args.setGptLoading || vi.fn(),
    setGptState: vi.fn(),
    setCurrentTaskDraft: (updater: (prev: TaskDraft) => TaskDraft) => {
      args.setDraft(updater(args.getCurrentDraft()));
    },
    gptStateRef: { current: { recentMessages: [], memory: createEmptyMemory() } },
    chatRecentLimit: 20,
    referenceLibraryItems: [],
    buildLibraryReferenceContext: () => "",
    imageLibraryReferenceEnabled: false,
    imageLibraryReferenceCount: 0,
    applyChatUsage: vi.fn(),
    applyTaskUsage: vi.fn(),
    applyCompressionUsage: vi.fn(),
    handleGptMemory: vi.fn(async () => ({
      compressionUsage: null,
      fallbackUsage: null,
      fallbackUsageDetails: null,
      fallbackMetrics: null,
      fallbackDebug: null,
    })),
    lastSearchContext: null,
    getTaskLibraryItem: () => null,
  } as unknown as Parameters<typeof runAttachSearchResultToTaskFlow>[0];
}

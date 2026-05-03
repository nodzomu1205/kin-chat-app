import { describe, expect, it, vi } from "vitest";
import { handleFileSaveRequestGate } from "@/lib/app/send-to-gpt/sendToGptPreparedGateHandlers";
import type { Message } from "@/types/chat";

describe("handleFileSaveRequestGate", () => {
  it("falls back to the latest full draft document when the request document id is unknown", async () => {
    const recordIngestedDocument = vi.fn(() => ({ id: "stored-1" }));
    const setGptMessages = vi.fn((updater: (prev: Message[]) => Message[]) =>
      updater([])
    );

    const handled = await handleFileSaveRequestGate({
      fileSaveRequestEvent: {
        taskId: "TASK-1",
        actionId: "F001",
        body: "Save it.",
        documentId: "Unknown",
      },
      userMsg: { id: "u1", role: "user", text: "save" },
      gptStateRef: {
        current: {
          recentMessages: [
            {
              id: "g1",
              role: "gpt",
              text: [
                "<<SYS_DRAFT_PREPARATION_RESPONSE>>",
                "TASK_ID: TASK-1",
                "ACTION_ID: D001",
                "DOCUMENT ID: DOC-TASK-1-001",
                "TITLE: Proposal",
                "BODY:",
                "Full draft body.",
                "<<END_SYS_DRAFT_PREPARATION_RESPONSE>>",
              ].join("\n"),
            },
          ],
        },
      },
      recordIngestedDocument,
      autoGenerateLibrarySummary: true,
      generateLibrarySummary: vi.fn(async () => ({
        summary: "Generated library summary.",
      })),
      setGptMessages: setGptMessages as never,
      setGptInput: vi.fn(),
    });

    expect(handled).toBe(true);
    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "DOC-TASK-1-001.txt",
        text: "Full draft body.",
        summary: "Generated library summary.",
      })
    );
    expect(setGptMessages.mock.results[0]?.value[1]?.text).toContain(
      "STATUS: SAVED"
    );
  });

  it("uses the latest full draft modification response when saving an unknown document", async () => {
    const recordIngestedDocument = vi.fn(() => ({ id: "stored-1" }));
    const setGptMessages = vi.fn((updater: (prev: Message[]) => Message[]) =>
      updater([])
    );

    const handled = await handleFileSaveRequestGate({
      fileSaveRequestEvent: {
        taskId: "TASK-1",
        actionId: "F002",
        body: "Save this document.",
        documentId: "Unknown",
      },
      userMsg: { id: "u1", role: "user", text: "save" },
      gptStateRef: {
        current: {
          recentMessages: [
            {
              id: "g1",
              role: "gpt",
              text: [
                "<<SYS_DRAFT_PREPARATION_RESPONSE>>",
                "TASK_ID: TASK-1",
                "ACTION_ID: D001",
                "DOCUMENT_ID: DOC-TASK-1-001",
                "TITLE: Old proposal",
                "BODY: Old draft body.",
                "<<END_SYS_DRAFT_PREPARATION_RESPONSE>>",
              ].join("\n"),
            },
            {
              id: "g2",
              role: "gpt",
              text: [
                "<<SYS_DRAFT_MODIFICATION_RESPONSE>>",
                "TASK_ID: TASK-1",
                "ACTION_ID: D002",
                "DOCUMENT ID: DOC-TASK-1-002",
                "RESPONSE_MODE: full_response",
                "TITLE: Revised proposal",
                "BODY:",
                "Revised full draft body.",
                "<<END_SYS_DRAFT_MODIFICATION_RESPONSE>>",
              ].join("\n"),
            },
          ],
        },
      },
      recordIngestedDocument,
      autoGenerateLibrarySummary: true,
      generateLibrarySummary: vi.fn(async () => ({
        summary: "Generated revised summary.",
      })),
      setGptMessages: setGptMessages as never,
      setGptInput: vi.fn(),
    });

    expect(handled).toBe(true);
    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "DOC-TASK-1-002.txt",
        title: "Revised proposal",
        text: "Revised full draft body.",
      })
    );
    expect(setGptMessages.mock.results[0]?.value[1]?.text).toContain(
      "DOCUMENT_ID: DOC-TASK-1-002"
    );
  });

  it("saves PPT design responses as presentation plan library items without a response document id header", async () => {
    const recordIngestedDocument = vi.fn(() => ({ id: "stored-1" }));
    const setGptMessages = vi.fn((updater: (prev: Message[]) => Message[]) =>
      updater([])
    );

    const handled = await handleFileSaveRequestGate({
      fileSaveRequestEvent: {
        taskId: "TASK-1",
        actionId: "F006",
        body: "Save the PPT design.",
        documentId: "Unknown",
      },
      userMsg: { id: "u1", role: "user", text: "save" },
      gptStateRef: {
        current: {
          recentMessages: [
            {
              id: "g1",
              role: "gpt",
              text: [
                "<<SYS_PPT_DESIGN_RESPONSE>>",
                "TASK_ID: TASK-1",
                "ACTION_ID: P001",
                "BODY:",
                "【PPT設計書】",
                "Document ID: ppt_TASK-1_001",
                "Title: Cotton deck",
                "Slide 1: Overview",
                "<<END_SYS_PPT_DESIGN_RESPONSE>>",
              ].join("\n"),
            },
          ],
        },
      },
      recordIngestedDocument,
      autoGenerateLibrarySummary: false,
      setGptMessages: setGptMessages as never,
      setGptInput: vi.fn(),
    });

    expect(handled).toBe(true);
    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactType: "presentation_plan",
        filename: "ppt_TASK-1_001.txt",
        text: expect.stringContaining("Document ID: ppt_TASK-1_001"),
        structuredPayload: expect.any(Object),
      })
    );
    expect(setGptMessages.mock.results[0]?.value[1]?.text).toContain(
      "DOCUMENT_ID: ppt_TASK-1_001"
    );
  });

  it("saves a latest full modification response with a blank document id under the previous draft id", async () => {
    const recordIngestedDocument = vi.fn(() => ({ id: "stored-1" }));
    const setGptMessages = vi.fn((updater: (prev: Message[]) => Message[]) =>
      updater([])
    );

    const handled = await handleFileSaveRequestGate({
      fileSaveRequestEvent: {
        taskId: "TASK-1",
        actionId: "F004",
        body: "Save the latest full draft.",
        documentId: "Unknown",
      },
      userMsg: { id: "u1", role: "user", text: "save" },
      gptStateRef: {
        current: {
          recentMessages: [
            {
              id: "g1",
              role: "gpt",
              text: [
                "<<SYS_DRAFT_PREPARATION_RESPONSE>>",
                "TASK_ID: TASK-1",
                "ACTION_ID: D001",
                "DOCUMENT_ID: DOC-TASK-1-001",
                "TITLE: Proposal",
                "BODY: Original draft body.",
                "<<END_SYS_DRAFT_PREPARATION_RESPONSE>>",
              ].join("\n"),
            },
            {
              id: "g2",
              role: "gpt",
              text: [
                "<<SYS_DRAFT_MODIFICATION_RESPONSE>>",
                "TASK_ID: TASK-1",
                "ACTION_ID: D003",
                "DOCUMENT_ID:",
                "RESPONSE_MODE: full",
                "BODY:",
                "Revised body from a response with a blank document id.",
                "<<END_SYS_DRAFT_MODIFICATION_RESPONSE>>",
              ].join("\n"),
            },
          ],
        },
      },
      recordIngestedDocument,
      autoGenerateLibrarySummary: true,
      generateLibrarySummary: vi.fn(async () => ({
        summary: "Generated revised summary.",
      })),
      setGptMessages: setGptMessages as never,
      setGptInput: vi.fn(),
    });

    expect(handled).toBe(true);
    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "DOC-TASK-1-001.txt",
        text: "Revised body from a response with a blank document id.",
      })
    );
  });

  it("does not generate a library summary for file saving when auto summary is disabled", async () => {
    const recordIngestedDocument = vi.fn(() => ({ id: "stored-1" }));
    const generateLibrarySummary = vi.fn(async () => ({
      summary: "Should not be used.",
    }));
    const setGptMessages = vi.fn((updater: (prev: Message[]) => Message[]) =>
      updater([])
    );

    const handled = await handleFileSaveRequestGate({
      fileSaveRequestEvent: {
        taskId: "TASK-1",
        actionId: "F005",
        body: "Save it.",
        documentId: "DOC-TASK-1-001",
      },
      userMsg: { id: "u1", role: "user", text: "save" },
      gptStateRef: {
        current: {
          recentMessages: [
            {
              id: "g1",
              role: "gpt",
              text: [
                "<<SYS_DRAFT_PREPARATION_RESPONSE>>",
                "TASK_ID: TASK-1",
                "ACTION_ID: D001",
                "DOCUMENT_ID: DOC-TASK-1-001",
                "TITLE: Proposal",
                "BODY: Full draft body.",
                "<<END_SYS_DRAFT_PREPARATION_RESPONSE>>",
              ].join("\n"),
            },
          ],
        },
      },
      recordIngestedDocument,
      autoGenerateLibrarySummary: false,
      generateLibrarySummary,
      setGptMessages: setGptMessages as never,
      setGptInput: vi.fn(),
    });

    expect(handled).toBe(true);
    expect(generateLibrarySummary).not.toHaveBeenCalled();
    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "DOC-TASK-1-001.txt",
        text: "Full draft body.",
        summary: undefined,
      })
    );
  });

  it("handles unresolved file saving requests instead of falling through to normal GPT chat", async () => {
    const recordIngestedDocument = vi.fn(() => ({ id: "stored-1" }));
    const setGptMessages = vi.fn((updater: (prev: Message[]) => Message[]) =>
      updater([])
    );

    const handled = await handleFileSaveRequestGate({
      fileSaveRequestEvent: {
        taskId: "TASK-1",
        actionId: "F003",
        body: "Save this document.",
        documentId: "Unknown",
      },
      userMsg: { id: "u1", role: "user", text: "save" },
      gptStateRef: { current: { recentMessages: [] } },
      recordIngestedDocument,
      autoGenerateLibrarySummary: true,
      setGptMessages: setGptMessages as never,
      setGptInput: vi.fn(),
    });

    expect(handled).toBe(true);
    expect(recordIngestedDocument).not.toHaveBeenCalled();
    expect(setGptMessages.mock.results[0]?.value[1]?.text).toContain(
      "STATUS: NEED_DOCUMENT"
    );
  });

  it("requests revision instead of saving when the draft misses the length constraint", async () => {
    const recordIngestedDocument = vi.fn(() => ({ id: "stored-1" }));
    const setGptMessages = vi.fn((updater: (prev: Message[]) => Message[]) =>
      updater([])
    );

    const handled = await handleFileSaveRequestGate({
      fileSaveRequestEvent: {
        taskId: "TASK-1",
        actionId: "F001",
        body: "Save it.",
        documentId: "DOC-TASK-1-001",
      },
      userMsg: { id: "u1", role: "user", text: "save" },
      gptStateRef: {
        current: {
          recentMessages: [
            {
              id: "g1",
              role: "gpt",
              text: [
                "<<SYS_DRAFT_PREPARATION_RESPONSE>>",
                "TASK_ID: TASK-1",
                "ACTION_ID: D001",
                "DOCUMENT_ID: DOC-TASK-1-001",
                "TITLE: Proposal",
                "BODY: short",
                "<<END_SYS_DRAFT_PREPARATION_RESPONSE>>",
              ].join("\n"),
            },
          ],
        },
      },
      currentTaskCharConstraint: { rule: "at_least", limit: 20 },
      recordIngestedDocument,
      autoGenerateLibrarySummary: true,
      setGptMessages: setGptMessages as never,
      setGptInput: vi.fn(),
    });

    expect(handled).toBe(true);
    expect(recordIngestedDocument).not.toHaveBeenCalled();
    expect(setGptMessages.mock.results[0]?.value[1]?.text).toContain(
      "STATUS: REVISION_REQUIRED"
    );
    expect(setGptMessages.mock.results[0]?.value[1]?.text).toContain(
      "DOCUMENT_ID: DOC-TASK-1-001"
    );
  });
});

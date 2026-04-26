import { beforeEach, describe, expect, it, vi } from "vitest";
import { runYoutubeTranscriptRequestItemFlow } from "@/lib/app/send-to-gpt/sendToGptYoutubeFlow";
import type { Message } from "@/types/chat";

function createFlowArgs(overrides: Partial<Parameters<typeof runYoutubeTranscriptRequestItemFlow>[0]> = {}) {
  const setGptMessages = vi.fn(
    (updater: Message[] | ((prev: Message[]) => Message[])) =>
      typeof updater === "function" ? updater([]) : updater
  );

  return {
    transcriptUrl: "https://www.youtube.com/watch?v=abc123",
    taskId: "TASK-1",
    actionId: "ACTION-1",
    outputMode: "summary_plus_raw",
    generateSummary: true,
    appendUserMessage: {
      id: "user-1",
      role: "user",
      text: "fetch transcript",
    } satisfies Message,
    setGptMessages,
    setGptInput: vi.fn(),
    setGptLoading: vi.fn(),
    setKinInput: vi.fn(),
    setPendingKinInjectionBlocks: vi.fn(),
    setPendingKinInjectionIndex: vi.fn(),
    focusKinPanel: vi.fn(),
    recordIngestedDocument: vi.fn(() => ({ id: "doc-1" })),
    ingestProtocolMessage: vi.fn(),
    gptStateRef: { current: { recentMessages: [] } },
    chatRecentLimit: 4,
    handleGptMemory: vi.fn(async () => ({})),
    applyChatUsage: vi.fn(),
    applyCompressionUsage: vi.fn(),
    applyIngestUsage: vi.fn(),
    ...overrides,
  } satisfies Parameters<typeof runYoutubeTranscriptRequestItemFlow>[0];
}

describe("sendToGptYoutubeFlow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches a transcript request item and prepares Kin transfer state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            title: "Transcript title",
            filename: "transcript.txt",
            text: "00:00 hello\n00:01 world",
            cleanText: "hello world",
            summary: "summary",
            usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
          }),
          { status: 200 }
        )
      )
    );
    const args = createFlowArgs();

    await runYoutubeTranscriptRequestItemFlow(args);

    expect(fetch).toHaveBeenCalledWith(
      "/api/youtube-transcript",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ videoId: "abc123", generateSummary: true }),
      })
    );
    expect(args.recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Transcript title",
        filename: "transcript.txt",
        text: "hello world",
        summary: "summary",
        taskId: "TASK-1",
      })
    );
    expect(args.ingestProtocolMessage).toHaveBeenCalledWith(
      expect.stringContaining("<<SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>"),
      "gpt_to_kin"
    );
    expect(args.setKinInput).toHaveBeenCalledWith(
      expect.stringContaining("hello world")
    );
    expect(args.handleGptMemory).toHaveBeenCalled();
    expect(args.setGptLoading).toHaveBeenLastCalledWith(false);
  });

  it("builds retry state when transcript fetching fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "No transcript" }), { status: 404 })
      )
    );
    const args = createFlowArgs({ appendUserMessage: null });

    await runYoutubeTranscriptRequestItemFlow(args);

    expect(args.ingestProtocolMessage).toHaveBeenCalledWith(
      expect.stringContaining("Transcript could not be fetched"),
      "gpt_to_kin"
    );
    expect(args.setKinInput).toHaveBeenCalledWith(
      expect.stringContaining("Failed URL:")
    );
    expect(args.handleGptMemory).not.toHaveBeenCalled();
    expect(args.setGptLoading).toHaveBeenLastCalledWith(false);
  });
});

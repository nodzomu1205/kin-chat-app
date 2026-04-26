import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  runImportYouTubeTranscriptFlow,
  runSendYouTubeTranscriptToKinFlow,
} from "@/lib/app/send-to-gpt/youtubeTranscriptLibraryFlows";

const source = {
  title: "Video title",
  link: "https://www.youtube.com/watch?v=abc123",
  videoId: "abc123",
  channelName: "Channel",
  duration: "1:00",
};

describe("youtubeTranscriptLibraryFlows", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("imports a transcript into the library and records ingest usage", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            title: "Transcript title",
            filename: "transcript.txt",
            text: "00:00 hello\n00:01 world",
            summary: "summary",
            usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
          }),
          { status: 200 }
        )
      )
    );

    const recordIngestedDocument = vi.fn((document) => ({
      ...document,
      id: "doc-1",
      sourceType: "ingested_file" as const,
    }));
    const setGptMessages = vi.fn();

    await runImportYouTubeTranscriptFlow({
      source,
      autoGenerateSummary: true,
      currentTaskId: "task-1",
      setGptLoading: vi.fn(),
      setGptMessages,
      applyIngestUsage: vi.fn(),
      recordIngestedDocument,
    });

    expect(recordIngestedDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Transcript title",
        filename: "transcript.txt",
        text: "hello world",
        summary: "summary",
        taskId: "task-1",
      })
    );
    expect(setGptMessages).toHaveBeenCalled();
  });

  it("prepares transcript blocks for Kin", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            text: "00:00 hello\n00:01 world",
            cleanText: "hello world",
            usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
          }),
          { status: 200 }
        )
      )
    );

    const setKinInput = vi.fn();

    await runSendYouTubeTranscriptToKinFlow({
      source,
      autoGenerateSummary: true,
      setGptLoading: vi.fn(),
      setGptMessages: vi.fn(),
      applyIngestUsage: vi.fn(),
      setKinInput,
      setPendingKinInjectionBlocks: vi.fn(),
      setPendingKinInjectionIndex: vi.fn(),
      focusKinPanel: vi.fn(() => true),
    });

    expect(setKinInput).toHaveBeenCalledWith(expect.stringContaining("hello world"));
  });
});

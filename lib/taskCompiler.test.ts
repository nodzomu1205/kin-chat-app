import { describe, expect, it } from "vitest";
import { compileKinTaskPrompt } from "@/lib/taskCompiler";
import type { TaskIntent } from "@/types/taskProtocol";

function createIntent(overrides?: Partial<TaskIntent["workflow"]>): TaskIntent {
  return {
    mode: "task",
    goal: "りすこのライバル女性YouTuberの動画コンテンツを5つ入手して、中身を解説・評価する文章を1000文字以上で送る",
    output: {
      type: "essay",
      language: "ja",
      length: "long",
    },
    workflow: {
      searchRequestCount: 3,
      searchRequestCountRule: "up_to",
      youtubeTranscriptRequestCount: 5,
      youtubeTranscriptRequestCountRule: "exact",
      allowSearchRequest: true,
      allowYoutubeTranscriptRequest: true,
      finalizationPolicy: "auto_when_ready",
      ...overrides,
    },
    constraints: ["Keep the final output at or above 1000 Japanese characters if feasible."],
  };
}

describe("taskCompiler", () => {
  it("includes youtube search and transcript rules when youtube workflow is enabled", () => {
    const prompt = compileKinTaskPrompt({
      taskId: "123456",
      title: "りすこのライバル女性YouTuber",
      intent: createIntent(),
    });

    expect(prompt).toContain("Supported ENGINE values are google_search, google_ai_mode, google_news, google_local, and youtube_search.");
    expect(prompt).toContain("Use <<SYS_YOUTUBE_TRANSCRIPT_REQUEST>> when you want GPT to fetch a YouTube transcript by URL.");
    expect(prompt).toContain("Before requesting transcripts, keep likely candidate video metadata in <<SYS_TASK_PROGRESS>> whenever possible, especially URL, TITLE, and CHANNEL.");
    expect(prompt).toContain("Request YouTube transcript support exactly 5 time(s).");
    expect(prompt).toContain("You may request web search support up to 3 time(s).");
  });

  it("includes multipart delivery constraints", () => {
    const prompt = compileKinTaskPrompt({
      taskId: "123456",
      title: "Multipart task",
      intent: createIntent(),
    });

    expect(prompt).toContain('If this <<SYS_TASK>> arrives as multiple PART n/total messages, reply only with "Received." until the final part arrives.');
    expect(prompt).toContain("The final part must clearly say it is the last part.");
  });

  it("emits youtube transcript request and progress examples", () => {
    const prompt = compileKinTaskPrompt({
      taskId: "123456",
      title: "YouTube task",
      intent: createIntent(),
    });

    expect(prompt).toContain("<<SYS_YOUTUBE_TRANSCRIPT_REQUEST>>");
    expect(prompt).toContain("ACTION_ID: Y001");
    expect(prompt).toContain("URL: https://www.youtube.com/watch?v=example");
    expect(prompt).toContain("Candidate YouTube videos shortlisted for transcript fetch.");
    expect(prompt).toContain("CHANNEL: Example channel");
  });

  it("omits youtube transcript sections when youtube workflow is disabled", () => {
    const prompt = compileKinTaskPrompt({
      taskId: "123456",
      title: "Search only task",
      intent: createIntent({
        allowYoutubeTranscriptRequest: false,
        youtubeTranscriptRequestCount: 0,
      }),
    });

    expect(prompt).not.toContain("<<SYS_YOUTUBE_TRANSCRIPT_REQUEST>>");
    expect(prompt).not.toContain("Request YouTube transcript support");
    expect(prompt).not.toContain("keep likely candidate video metadata");
  });

  it("treats non-up_to search workflow as required instead of optional", () => {
    const prompt = compileKinTaskPrompt({
      taskId: "123456",
      title: "Required search task",
      intent: createIntent({
        searchRequestCountRule: "exact",
      }),
    });

    expect(prompt).toContain("Request web search support exactly 3 time(s).");
    expect(prompt).not.toContain("You may request web search support up to 3 time(s).");
  });

  it("treats up_to youtube transcript workflow as optional", () => {
    const prompt = compileKinTaskPrompt({
      taskId: "123456",
      title: "Optional transcript task",
      intent: createIntent({
        youtubeTranscriptRequestCountRule: "up_to",
      }),
    });

    expect(prompt).toContain("You may request YouTube transcript support up to 5 time(s).");
    expect(prompt).not.toContain("Request YouTube transcript support exactly 5 time(s).");
  });
});

import { describe, expect, it } from "vitest";
import { compileKinTaskPrompt } from "@/lib/task/taskCompiler";
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
    constraints: [
      "You can perform up to 2 searches.",
      "You can make up to 3 requests to GPT.",
      "Please summarize the final output within 1000 characters.",
    ],
  };
}

describe("taskCompiler", () => {
  it("places constraints near the top and omits completion criteria", () => {
    const prompt = compileKinTaskPrompt({
      taskId: "123456",
      title: "りすこのライバル女性YouTuber",
      intent: createIntent(),
    });

    expect(prompt).toContain("CONSTRAINTS:");
    expect(prompt).toContain("- You can perform up to 2 searches.");
    expect(prompt).toContain("- You can make up to 3 requests to GPT.");
    expect(prompt).toContain(
      "- Please summarize the final output within 1000 characters."
    );
    expect(prompt).not.toContain("COMPLETION_CRITERIA:");
  });

  it("omits required and optional workflow sections", () => {
    const prompt = compileKinTaskPrompt({
      taskId: "123456",
      title: "Workflowless task",
      intent: createIntent(),
    });

    expect(prompt).not.toContain("REQUIRED_WORKFLOW:");
    expect(prompt).not.toContain("OPTIONAL_WORKFLOW:");
  });

  it("includes multipart delivery constraints", () => {
    const prompt = compileKinTaskPrompt({
      taskId: "123456",
      title: "Multipart task",
      intent: createIntent(),
    });

    expect(prompt).toContain("Every SYS block you send must end with the matching <<END_SYS_...>> line.");
    expect(prompt).toContain(
      "reply only with <<KIN_RESPONSE>> Received. Send the next. <<END_KIN_RESPONSE>> until the final part arrives."
    );
    expect(prompt).toContain("The final part must clearly say it is the last part.");
    expect(prompt.trim().endsWith("<<END_SYS_TASK>>")).toBe(true);
  });

  it("emits youtube transcript request and progress examples", () => {
    const prompt = compileKinTaskPrompt({
      taskId: "123456",
      title: "YouTube task",
      intent: createIntent(),
    });

    expect(prompt).toContain("<<SYS_YOUTUBE_TRANSCRIPT_REQUEST>>");
    expect(prompt).toContain(
      "COPY RULE: Every <<SYS_...>> example below must be sent with its matching <<END_SYS_...>> closing line."
    );
    expect(prompt).toContain("EXAMPLE: YOUTUBE_TRANSCRIPT_REQUEST");
    expect(prompt).toContain("END_EXAMPLE: YOUTUBE_TRANSCRIPT_REQUEST");
    expect(prompt).toContain("ACTION_ID: Y001");
    expect(prompt).toContain("URL: https://www.youtube.com/watch?v=example");
    expect(prompt).toContain("Candidate YouTube videos shortlisted for transcript fetch.");
    expect(prompt).toContain("CHANNEL: Example channel");
  });
});

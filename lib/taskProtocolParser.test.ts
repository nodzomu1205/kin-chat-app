import { describe, expect, it } from "vitest";
import {
  extractTaskProtocolEvents,
  normalizeTaskProtocolEventType,
  parseProtocolBlockFields,
  parseProtocolPart,
  parseProtocolRequired,
  parseProtocolSearchOutputMode,
  parseProtocolUrls,
} from "@/lib/taskProtocolParser";

describe("taskProtocolParser", () => {
  it("normalizes known SYS block types", () => {
    expect(normalizeTaskProtocolEventType("TASK_PROGRESS")).toBe("task_progress");
    expect(normalizeTaskProtocolEventType("YOUTUBE_TRANSCRIPT_REQUEST")).toBe(
      "youtube_transcript_request"
    );
    expect(normalizeTaskProtocolEventType("UNKNOWN")).toBeNull();
  });

  it("parses multiline block fields", () => {
    const fields = parseProtocolBlockFields(
      "SUMMARY: first line\nsecond line\nBODY: detail"
    );

    expect(fields.SUMMARY).toBe("first line\nsecond line");
    expect(fields.BODY).toBe("detail");
  });

  it("parses required and output mode values", () => {
    expect(parseProtocolRequired("YES")).toBe(true);
    expect(parseProtocolRequired("no")).toBe(false);
    expect(parseProtocolSearchOutputMode("summary_with_sources")).toBe(
      "summary_plus_raw"
    );
    expect(parseProtocolSearchOutputMode("raw")).toBe("raw");
  });

  it("parses multipart markers", () => {
    expect(parseProtocolPart("2/5")).toEqual({ partIndex: 2, totalParts: 5 });
    expect(parseProtocolPart(undefined)).toEqual({});
  });

  it("parses multiple youtube transcript urls", () => {
    expect(
      parseProtocolUrls(
        "- https://www.youtube.com/watch?v=aaa\n- https://youtu.be/bbb"
      )
    ).toEqual([
      "https://www.youtube.com/watch?v=aaa",
      "https://youtu.be/bbb",
    ]);
  });

  it("extracts protocol events while ignoring SYS_TASK and SYS_INFO blocks", () => {
    const text = `<<SYS_TASK>>
TASK_ID: 111
BODY: hidden
<<SYS_TASK_END>>
<<SYS_SEARCH_RESPONSE>>
TASK_ID: 222
ACTION_ID: S001
QUERY: napoleon marshals
ENGINE: youtube_search
LOCATION: Japan
OUTPUT_MODE: summary_with_sources
RAW_RESULT_ID: RAW-1
SUMMARY: Digest line
PART: 1/2
<<END_SYS_SEARCH_RESPONSE>>
<<SYS_INFO>>
TITLE: hidden info
<<END_SYS_INFO>>`;

    const events = extractTaskProtocolEvents(text);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "search_response",
      taskId: "222",
      actionId: "S001",
      query: "napoleon marshals",
      searchEngine: "youtube_search",
      searchLocation: "Japan",
      outputMode: "summary_plus_raw",
      rawResultId: "RAW-1",
      summary: "Digest line",
      partIndex: 1,
      totalParts: 2,
    });
  });

  it("prefers BODY and falls back to SEARCH_GOAL or SUMMARY", () => {
    const bodyEvent = extractTaskProtocolEvents(`<<SYS_GPT_RESPONSE>>
TASK_ID: 1
BODY: hello
<<END_SYS_GPT_RESPONSE>>`);
    const searchGoalEvent = extractTaskProtocolEvents(`<<SYS_SEARCH_REQUEST>>
TASK_ID: 1
SEARCH_GOAL: find sources
<<END_SYS_SEARCH_REQUEST>>`);

    expect(bodyEvent[0]?.body).toBe("hello");
    expect(searchGoalEvent[0]?.body).toBe("find sources");
  });

  it("extracts URLS from youtube transcript request blocks", () => {
    const events = extractTaskProtocolEvents(`<<SYS_YOUTUBE_TRANSCRIPT_REQUEST>>
TASK_ID: 1
ACTION_ID: YT001
URLS:
- https://www.youtube.com/watch?v=aaa
- https://youtu.be/bbb
BODY: fetch both
<<END_SYS_YOUTUBE_TRANSCRIPT_REQUEST>>`);

    expect(events[0]).toMatchObject({
      type: "youtube_transcript_request",
      taskId: "1",
      actionId: "YT001",
      url: "https://www.youtube.com/watch?v=aaa",
      urls: [
        "https://www.youtube.com/watch?v=aaa",
        "https://youtu.be/bbb",
      ],
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  applyCommittedTopicContext,
  buildRejectedReapplyContext,
  normalizeMemoryContextState,
  stabilizeMemoryContextState,
} from "@/lib/app/memory-interpreter/memoryInterpreterContextReducer";

describe("memoryInterpreterContextReducer", () => {
  it("normalizes tracked context fields only", () => {
    expect(
      normalizeMemoryContextState({
        currentTopic: " 日本の歴史 ",
        proposedTopic: " 縄文時代 ",
        currentTask: " 日本の歴史を知りたい ",
        followUpRule: " 直前topicを引き継ぐ ",
        lastUserIntent: " 日本の歴史を教えて下さい ",
        extra: "ignored",
      })
    ).toEqual({
      currentTopic: "日本の歴史",
      proposedTopic: "縄文時代",
      currentTask: "日本の歴史を知りたい",
      followUpRule: "直前topicを引き継ぐ",
      lastUserIntent: "日本の歴史を教えて下さい",
    });
  });

  it("stabilizes committed topic fields from the candidate context", () => {
    expect(
      stabilizeMemoryContextState({
        candidateContext: {
          currentTopic: "日本の歴史",
          proposedTopic: "縄文時代",
          currentTask: "日本の歴史を知りたい",
          followUpRule: "直前の日本の歴史topicを引き継ぐ",
          lastUserIntent: "縄文時代について知りたい",
        },
        mergedContext: {
          currentTopic: "別topic",
          proposedTopic: undefined,
          currentTask: "別task",
          followUpRule: "別rule",
          lastUserIntent: "別intent",
        },
        latestMeaningfulUserText:
          "なぜそんなにも長く続いて文化も栄えた縄文時代が終わってしまったのですか？",
      })
    ).toEqual({
      currentTopic: "日本の歴史",
      proposedTopic: "縄文時代",
      currentTask: "日本の歴史を知りたい",
      followUpRule: "直前の日本の歴史topicを引き継ぐ",
      lastUserIntent:
        "なぜそんなにも長く続いて文化も栄えた縄文時代が終わってしまったのですか?",
    });
  });

  it("builds committed topic context with cleared proposal", () => {
    expect(
      applyCommittedTopicContext(
        {
          proposedTopic: "縄文時代",
          currentTask: "日本の歴史を知りたい",
          followUpRule: "直前topicを引き継ぐ",
          lastUserIntent: "縄文時代について知りたい",
        },
        "日本の歴史"
      )
    ).toEqual({
      currentTopic: "日本の歴史",
      proposedTopic: undefined,
      currentTask: expect.stringContaining("日本の歴史"),
      followUpRule: expect.stringContaining("日本の歴史"),
      lastUserIntent: "縄文時代について知りたい",
    });
  });

  it("builds rejected reapply context by clearing topic fields only", () => {
    expect(
      buildRejectedReapplyContext({
        currentTopic: "日本の歴史",
        proposedTopic: "縄文時代",
        currentTask: "日本の歴史を知りたい",
        followUpRule: "直前topicを引き継ぐ",
        lastUserIntent: "縄文時代について知りたい",
      })
    ).toEqual({
      currentTopic: undefined,
      proposedTopic: undefined,
      currentTask: undefined,
      followUpRule: undefined,
      lastUserIntent: "縄文時代について知りたい",
    });
  });
});

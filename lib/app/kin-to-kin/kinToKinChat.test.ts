import { describe, expect, it } from "vitest";
import {
  buildKinToKinLimitNotice,
  buildKinToKinRelayBlock,
  buildKinToKinStartBlock,
  buildKinToKinSummaryRequest,
  parseKinToKinChatReply,
} from "@/lib/app/kin-to-kin/kinToKinChat";

describe("kinToKinChat", () => {
  it("builds the initial Kin-to-Kin chat request", () => {
    const block = buildKinToKinStartBlock({
      starter: "AAA",
      partner: "BBB",
      topic: "market outlook",
      maxCount: 50,
    });

    expect(block).toContain("<<SYS_KIN_TO_KIN_CHAT>>");
    expect(block).toContain("MAX_CHAT_COUNT: 50");
    expect(block).toContain("CHAT_MEMBERS: AAA, BBB");
    expect(block).toContain("<<SYS_AAA_TO_BBB_CHAT>>");
  });

  it("parses a wrapped Kin-to-Kin reply and removes relay metadata", () => {
    const parsed = parseKinToKinChatReply(
      [
        "<<SYS_AAA_TO_BBB_CHAT>>",
        "CHAT_COUNT: 1/50",
        "TOPIC: market outlook",
        "Hello BBB.",
        "NOTICE: Reply with the expected block.",
        "<<END_SYS_AAA_TO_BBB_CHAT>>",
      ].join("\n"),
      { from: "AAA", to: "BBB" }
    );

    expect(parsed).toEqual({
      from: "AAA",
      to: "BBB",
      text: "Hello BBB.",
      matchedProtocol: true,
    });
  });

  it("builds relay, completion notice, and summary request text", () => {
    expect(
      buildKinToKinRelayBlock({
        from: "AAA",
        to: "BBB",
        message: "Hello.",
        topic: "market outlook",
        count: 1,
        maxCount: 2,
      })
    ).toContain("CHAT_COUNT: 1/2");

    expect(
      buildKinToKinLimitNotice({ maxCount: 2, topic: "market outlook" })
    ).toContain("上限 2 回");

    expect(
      buildKinToKinSummaryRequest({
        topic: "market outlook",
        entries: [
          {
            id: "entry-1",
            from: "AAA",
            to: "BBB",
            text: "Hello.",
            count: 1,
            maxCount: 2,
            createdAt: "2026-05-21T00:00:00.000Z",
          },
        ],
      })
    ).toContain("1/2 AAA -> BBB: Hello.");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildKinGroupChatRelayBlock,
  buildKinGroupChatRetryBlock,
  buildKinGroupChatStartBlock,
  buildKinToKinEndedNotice,
  buildKinToKinLimitNotice,
  buildKinToKinRelayBlock,
  buildKinToKinStartBlock,
  buildKinToKinSummaryRequest,
  containsKinGroupChatEndToken,
  parseKinToKinProtocolBlock,
  parseKinToKinChatReply,
  validateKinGroupChatRoute,
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
    expect(block).toContain("**END THE CHAT**");
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
      buildKinToKinRelayBlock({
        from: "BBB",
        to: "AAA",
        message: "Your turn.",
        topic: "market outlook",
        count: 1,
        maxCount: 2,
        canEndChat: true,
      })
    ).toContain("As the starter, you may end the chat");

    expect(
      buildKinToKinLimitNotice({ maxCount: 2, topic: "market outlook" })
    ).toContain("上限 2 回");
    expect(buildKinToKinEndedNotice({ topic: "market outlook" })).toContain(
      "終了トークン"
    );
    expect(buildKinToKinEndedNotice({ topic: "market outlook" })).not.toContain(
      "上限"
    );

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

  it("builds facilitator-first group chat notices without wrapping incoming bodies", () => {
    const start = buildKinGroupChatStartBlock({
      facilitator: "AAA",
      participants: ["AAA", "BBB", "CCC"],
      topic: "market outlook",
      maxCount: 6,
    });

    expect(start).toContain("<<SYS_KIN_TO_KIN_CHAT>>");
    expect(start).toContain("- AAA (facilitator, you)");
    expect(start).toContain("Choose exactly one next speaker");
    expect(start).toContain("<<SYS_AAA_TO_[ChosenParticipantKinName]_CHAT>>");
    expect(start).toContain("**END THE CHAT**");

    const relay = buildKinGroupChatRelayBlock({
      facilitator: "AAA",
      participants: ["AAA", "BBB", "CCC"],
      recipient: "BBB",
      sender: "AAA",
      message: "Please compare this with the prior point.",
    });

    expect(relay).toContain("Reply only to the facilitator, AAA.");
    expect(relay).toContain("Incoming message from the facilitator:");
    expect(relay).toContain("Please compare this with the prior point.");
    expect(relay).not.toContain("<<SYS_AAA_TO_BBB_CHAT>>");
  });

  it("validates group chat routing through the facilitator", () => {
    const members = [
      { id: "a", label: "AAA" },
      { id: "b", label: "BBB" },
      { id: "c", label: "CCC" },
    ];
    const parsed = parseKinToKinProtocolBlock(
      "<<SYS_BBB_TO_AAA_CHAT>>\nI think CCC should answer next.\n<<END_SYS_BBB_TO_AAA_CHAT>>"
    );

    expect(
      validateKinGroupChatRoute({
        parsed,
        sender: members[1],
        facilitator: members[0],
        members,
      })
    ).toMatchObject({
      ok: true,
      from: "BBB",
      to: "AAA",
      text: "I think CCC should answer next.",
      recipient: members[0],
    });

    expect(
      validateKinGroupChatRoute({
        parsed: parseKinToKinProtocolBlock(
          "<<SYS_BBB_TO_CCC_CHAT>>\nDirect question.\n<<END_SYS_BBB_TO_CCC_CHAT>>"
        ),
        sender: members[1],
        facilitator: members[0],
        members,
      })
    ).toMatchObject({
      ok: false,
      reason: "Participants must reply to the facilitator, AAA.",
    });
  });

  it("builds group chat retry messages for invalid routes", () => {
    const retry = buildKinGroupChatRetryBlock({
      facilitator: "AAA",
      participants: ["AAA", "BBB", "CCC"],
      sender: "BBB",
      reason: "Participants must reply to the facilitator, AAA.",
    });

    expect(retry).toContain("Your previous reply could not be relayed");
    expect(retry).toContain("Reply only to the facilitator, AAA.");
    expect(retry).toContain("<<SYS_BBB_TO_AAA_CHAT>>");
  });

  it("detects the facilitator end-chat token in message bodies", () => {
    expect(containsKinGroupChatEndToken("Thanks. **END THE CHAT**")).toBe(true);
    expect(containsKinGroupChatEndToken("Thanks. **(END THE CHAT)**")).toBe(
      true
    );
    expect(containsKinGroupChatEndToken("Please continue.")).toBe(false);
  });
});

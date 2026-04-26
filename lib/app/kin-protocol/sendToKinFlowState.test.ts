import { describe, expect, it } from "vitest";
import {
  buildContinueTaskAfterMultipartReceiptBlock,
  extractTaskIdFromOutboundText,
  hasKinReceipt,
  hasKinReceivedAck,
  resolveKinFollowupInput,
  resolvePendingKinInjectionAction,
  shouldPromptKinToContinueAfterPendingInfoDelivery,
} from "@/lib/app/kin-protocol/sendToKinFlowState";

describe("sendToKinFlowState", () => {
  it("detects Kin ACK blocks in both legacy and current formats", () => {
    expect(
      hasKinReceivedAck(
        "<<KIN_RESPONSE>>\nReceived. Send the next.\n<<END_KIN_RESPONSE>>"
      )
    ).toBe(true);
    expect(
      hasKinReceivedAck(
        "<<SYS_KIN_RESPONSE>>\nReceived. Send the next part.\n<<END_SYS_KIN_RESPONSE>>"
      )
    ).toBe(true);
  });

  it("detects plain receipt blocks without requiring next-part guidance", () => {
    expect(
      hasKinReceipt("<<KIN_RESPONSE>>\nReceived.\n<<END_KIN_RESPONSE>>")
    ).toBe(true);
  });

  it("advances pending injections only when the sent block is ACKed", () => {
    expect(
      resolvePendingKinInjectionAction({
        text: "PART 1/2",
        currentPendingBlock: "PART 1/2",
        replyText:
          "<<KIN_RESPONSE>>\nReceived. Send the next.\n<<END_KIN_RESPONSE>>",
        pendingKinInjectionIndex: 0,
        pendingKinInjectionBlocks: ["PART 1/2", "PART 2/2"],
      })
    ).toEqual({
      type: "advance",
      nextIndex: 1,
      nextInput: "PART 2/2",
    });
  });

  it("marks the pending injection as complete on the final ACKed part", () => {
    expect(
      resolvePendingKinInjectionAction({
        text: "PART 2/2",
        currentPendingBlock: "PART 2/2",
        replyText:
          "<<KIN_RESPONSE>>\nReceived. Send the next.\n<<END_KIN_RESPONSE>>",
        pendingKinInjectionIndex: 1,
        pendingKinInjectionBlocks: ["PART 1/2", "PART 2/2"],
      })
    ).toEqual({
      type: "complete",
      nextIndex: 2,
      finalReceiptOnly: false,
      finalReplyNeedsTaskContinuation: false,
    });
  });

  it("completes the final pending part on a plain receipt", () => {
    expect(
      resolvePendingKinInjectionAction({
        text: "PART 2/2",
        currentPendingBlock: "PART 2/2",
        replyText: "<<KIN_RESPONSE>>\nReceived.\n<<END_KIN_RESPONSE>>",
        pendingKinInjectionIndex: 1,
        pendingKinInjectionBlocks: ["PART 1/2", "PART 2/2"],
      })
    ).toEqual({
      type: "complete",
      nextIndex: 2,
      finalReceiptOnly: true,
      finalReplyNeedsTaskContinuation: true,
    });
  });

  it("completes the final pending part even without a Kin receipt", () => {
    expect(
      resolvePendingKinInjectionAction({
        text: "PART 2/2",
        currentPendingBlock: "PART 2/2",
        replyText: "",
        pendingKinInjectionIndex: 1,
        pendingKinInjectionBlocks: ["PART 1/2", "PART 2/2"],
      })
    ).toEqual({
      type: "complete",
      nextIndex: 2,
      finalReceiptOnly: false,
      finalReplyNeedsTaskContinuation: true,
    });
  });

  it("completes a final part when the PART marker matches even if surrounding text changed", () => {
    expect(
      resolvePendingKinInjectionAction({
        text: "<<SYS_INFO>>\nPART: 2/2\npayload\n<<END_SYS_INFO>>",
        currentPendingBlock:
          "<<SYS_INFO>>\nPART: 2/2\noriginal payload\n<<END_SYS_INFO>>",
        replyText:
          "<<SYS_KIN_RESPONSE>>\nReceived.\n<<END_SYS_KIN_RESPONSE>>",
        pendingKinInjectionIndex: 1,
        pendingKinInjectionBlocks: ["PART 1/2", "PART 2/2"],
      })
    ).toEqual({
      type: "complete",
      nextIndex: 2,
      finalReceiptOnly: true,
      finalReplyNeedsTaskContinuation: true,
    });
  });

  it("builds a continue-task prompt after a final receipt-only multipart reply", () => {
    expect(buildContinueTaskAfterMultipartReceiptBlock()).toBe(
      [
        "<<SYS_GPT_RESPONSE>>",
        "BODY: Noted. Continue the task.",
        "<<END_SYS_GPT_RESPONSE>>",
      ].join("\n")
    );
  });

  it("prompts task continuation for final info delivery receipts and progress-only replies", () => {
    expect(
      shouldPromptKinToContinueAfterPendingInfoDelivery(
        "<<SYS_KIN_RESPONSE>>\nReceived.\n<<END_SYS_KIN_RESPONSE>>"
      )
    ).toBe(true);

    expect(
      shouldPromptKinToContinueAfterPendingInfoDelivery(
        [
          "<<SYS_TASK_PROGRESS>>",
          "TASK_ID: 123456",
          "SUMMARY: 作業開始します。",
          "<<END_SYS_TASK_PROGRESS>>",
        ].join("\n")
      )
    ).toBe(true);
  });

  it("does not prompt continuation when Kin returns a concrete GPT-facing request", () => {
    expect(
      shouldPromptKinToContinueAfterPendingInfoDelivery(
        [
          "<<SYS_ASK_GPT>>",
          "TASK_ID: 123456",
          "ACTION_ID: A001",
          "BODY: Check this point.",
          "<<END_SYS_ASK_GPT>>",
        ].join("\n")
      )
    ).toBe(false);
  });

  it("builds a resend followup when Kin returns an unusable reply", () => {
    const followup = resolveKinFollowupInput({
      replyText: "Kin did not return a usable response.",
      outboundText: "<<SYS_TASK>>\n#123456\n<<END_SYS_TASK>>",
    });

    expect(followup).toContain("<<SYS_GPT_RESPONSE>>");
    expect(followup).toContain("123456");
  });

  it("builds a progress ACK when Kin only reports task progress", () => {
    const followup = resolveKinFollowupInput({
      replyText: [
        "<<SYS_TASK_PROGRESS>>",
        "TASK_ID: 123456",
        "STATUS: IN_PROGRESS",
        "SUMMARY: Working.",
        "<<END_SYS_TASK_PROGRESS>>",
      ].join("\n"),
      outboundText: "ignored",
    });

    expect(followup).toContain("123456");
    expect(followup).toContain("Noted. Continue the work.");
  });

  it("extracts task ids from outbound text", () => {
    expect(extractTaskIdFromOutboundText("TASK_ID: 123456")).toBe("123456");
    expect(
      extractTaskIdFromOutboundText("<<SYS_TASK>>\n#654321\n<<END_SYS_TASK>>")
    ).toBe("654321");
  });
});

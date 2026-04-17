import { describe, expect, it } from "vitest";
import {
  extractTaskIdFromOutboundText,
  hasKinReceipt,
  hasKinReceivedAck,
  resolveKinFollowupInput,
  resolvePendingKinInjectionAction,
} from "@/lib/app/sendToKinFlowState";

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
    });
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

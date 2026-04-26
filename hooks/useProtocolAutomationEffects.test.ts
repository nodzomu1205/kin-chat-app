import { describe, expect, it } from "vitest";
import { resolveProtocolAutoSendAction } from "@/hooks/useProtocolAutomationEffects";

const SYS_BLOCK = [
  "<<SYS_GPT_RESPONSE>>",
  "BODY: Resend the message.",
  "<<END_SYS_GPT_RESPONSE>>",
].join("\n");

describe("resolveProtocolAutoSendAction", () => {
  it("allows the same SYS input to auto-send again after the input is cleared", () => {
    const first = resolveProtocolAutoSendAction({
      input: SYS_BLOCK,
      enabled: true,
      loading: false,
      lastSentInput: "",
    });
    const cleared = resolveProtocolAutoSendAction({
      input: "",
      enabled: true,
      loading: false,
      lastSentInput: first.nextLastSentInput,
    });
    const second = resolveProtocolAutoSendAction({
      input: SYS_BLOCK,
      enabled: true,
      loading: false,
      lastSentInput: cleared.nextLastSentInput,
    });

    expect(first.shouldSend).toBe(true);
    expect(cleared.nextLastSentInput).toBe("");
    expect(second.shouldSend).toBe(true);
  });

  it("does not repeatedly auto-send the same still-present SYS input", () => {
    const action = resolveProtocolAutoSendAction({
      input: SYS_BLOCK,
      enabled: true,
      loading: false,
      lastSentInput: SYS_BLOCK,
    });

    expect(action.shouldSend).toBe(false);
    expect(action.nextLastSentInput).toBe(SYS_BLOCK);
  });
});

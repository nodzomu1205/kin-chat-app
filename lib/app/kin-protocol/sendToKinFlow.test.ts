import { describe, expect, it, vi } from "vitest";
import { runSendKinMessageFlow } from "@/lib/app/kin-protocol/sendToKinFlow";

function createArgs(
  overrides: Partial<Parameters<typeof runSendKinMessageFlow>[0]> = {}
) {
  return {
    text: "<<SYS_INFO>>\nPART: 2/2\npayload\n<<END_SYS_INFO>>",
    currentKin: "kin-1",
    kinLoading: false,
    setKinConnectionState: vi.fn(),
    setKinLoading: vi.fn(),
    pendingKinInjectionBlocks: [
      "<<SYS_INFO>>\nPART: 1/2\npayload\n<<END_SYS_INFO>>",
      "<<SYS_INFO>>\nPART: 2/2\npayload\n<<END_SYS_INFO>>",
    ],
    pendingKinInjectionIndex: 1,
    pendingKinInjectionPurpose: "info_share" as const,
    setKinMessages: vi.fn(),
    setKinInput: vi.fn(),
    ingestProtocolMessage: vi.fn(),
    processMultipartTaskDoneText: vi.fn(),
    setPendingKinInjectionIndex: vi.fn(),
    clearPendingKinInjection: vi.fn(),
    onPendingKinAck: vi.fn(),
    onSysTaskSent: vi.fn(),
    onKinReply: vi.fn(),
    ...overrides,
  };
}

describe("runSendKinMessageFlow", () => {
  it("does not set a continue-task prompt after a plain info-share multipart receipt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            reply: "<<SYS_KIN_RESPONSE>>\nReceived.\n<<END_SYS_KIN_RESPONSE>>",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    const args = createArgs();

    await runSendKinMessageFlow(args);

    expect(args.clearPendingKinInjection).toHaveBeenCalled();
    expect(args.onPendingKinAck).not.toHaveBeenCalled();
    expect(args.setKinInput).toHaveBeenCalledWith("");
    expect(args.setKinInput).not.toHaveBeenCalledWith(
      "<<SYS_GPT_RESPONSE>>\nBODY: Noted. Continue the task.\n<<END_SYS_GPT_RESPONSE>>"
    );
    vi.unstubAllGlobals();
  });

  it("sets a continue-task prompt after a task-context multipart receipt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            reply: "<<SYS_KIN_RESPONSE>>\nReceived.\n<<END_SYS_KIN_RESPONSE>>",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
    );
    const args = createArgs({
      pendingKinInjectionPurpose: "task_context",
    });

    await runSendKinMessageFlow(args);

    expect(args.clearPendingKinInjection).toHaveBeenCalled();
    expect(args.onPendingKinAck).toHaveBeenCalled();
    expect(args.setKinInput).toHaveBeenCalledWith(
      "<<SYS_GPT_RESPONSE>>\nBODY: Noted. Continue the task.\n<<END_SYS_GPT_RESPONSE>>"
    );
    vi.unstubAllGlobals();
  });

  it("stores the active Kin label on Kin reply messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ reply: "Hello from Kin One." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    const setKinMessages = vi.fn();
    const args = createArgs({
      pendingKinInjectionBlocks: [],
      setKinMessages,
      kinSpeakerLabel: "Kin One",
    });

    await runSendKinMessageFlow(args);

    const appendKinReply = setKinMessages.mock.calls.find((call) => {
      const updater = call[0] as (prev: unknown[]) => unknown[];
      const next = updater([]);
      return next.some(
        (message) =>
          typeof message === "object" &&
          message !== null &&
          "role" in message &&
          message.role === "kin"
      );
    })?.[0] as (prev: unknown[]) => Array<{ role: string; meta?: unknown }>;

    expect(appendKinReply([])).toContainEqual(
      expect.objectContaining({
        role: "kin",
        meta: { speakerLabel: "Kin One" },
      })
    );
    vi.unstubAllGlobals();
  });

  it("can skip appending the outbound user message for grouped multi-send display", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ reply: "Hello from Kin One." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    const setKinMessages = vi.fn();
    const setKinInput = vi.fn();
    const ingestProtocolMessage = vi.fn();
    const args = createArgs({
      pendingKinInjectionBlocks: [],
      setKinMessages,
      setKinInput,
      ingestProtocolMessage,
      appendUserMessage: false,
    });

    await runSendKinMessageFlow(args);

    const appendedRoles = setKinMessages.mock.calls.flatMap((call) => {
      const updater = call[0] as (prev: unknown[]) => Array<{ role: string }>;
      return updater([]).map((message) => message.role);
    });

    expect(appendedRoles).toEqual(["kin"]);
    expect(setKinInput).not.toHaveBeenCalledWith("");
    expect(ingestProtocolMessage).not.toHaveBeenCalledWith(
      args.text,
      "user_to_kin"
    );
    vi.unstubAllGlobals();
  });

  it("can display a shorter outbound user message than the API payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ reply: "Hello from Kin One." }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    const setKinMessages = vi.fn();
    const args = createArgs({
      text: "<<KIN_CHAT_WINDOW_CONTEXT>>\nContext\n<<END_KIN_CHAT_WINDOW_CONTEXT>>\n\nUSER_MESSAGE:\nHello.",
      pendingKinInjectionBlocks: [],
      setKinMessages,
      userMessageText: "Hello.",
    });

    await runSendKinMessageFlow(args);

    const appendUser = setKinMessages.mock.calls.find((call) => {
      const updater = call[0] as (prev: unknown[]) => unknown[];
      const next = updater([]);
      return next.some(
        (message) =>
          typeof message === "object" &&
          message !== null &&
          "role" in message &&
          message.role === "user"
      );
    })?.[0] as (prev: unknown[]) => Array<{ role: string; text: string }>;

    expect(appendUser([])).toContainEqual(
      expect.objectContaining({ role: "user", text: "Hello." })
    );
    expect(fetch).toHaveBeenCalledWith(
      "/api/kindroid",
      expect.objectContaining({
        body: expect.stringContaining("<<KIN_CHAT_WINDOW_CONTEXT>>"),
      })
    );
    vi.unstubAllGlobals();
  });
});

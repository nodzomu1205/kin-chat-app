import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import {
  applyMultiKinPendingInjectionAction,
  isTaskTargetedProtocolText,
  resolveKinSendTargets,
} from "@/hooks/useKinTransferActions";

describe("resolveKinSendTargets", () => {
  const kinList = [
    { id: "kin-1", label: "Kin One" },
    { id: "kin-2", label: "Kin Two" },
    { id: "kin-3", label: "Kin Three" },
  ];

  it("uses selected Kin ids as the send targets", () => {
    expect(
      resolveKinSendTargets({
        currentKin: "kin-1",
        selectedKinIds: ["kin-2", "kin-3"],
        kinList,
      })
    ).toEqual([kinList[1], kinList[2]]);
  });

  it("falls back to the current Kin when no send targets are selected", () => {
    expect(
      resolveKinSendTargets({
        currentKin: "kin-1",
        selectedKinIds: [],
        kinList,
      })
    ).toEqual([kinList[0]]);
  });

  it("ignores stale selected Kin ids", () => {
    expect(
      resolveKinSendTargets({
        currentKin: "kin-1",
        selectedKinIds: ["missing", "kin-2"],
        kinList,
      })
    ).toEqual([kinList[1]]);
  });

  it("classifies task response protocols as task-targeted", () => {
    expect(isTaskTargetedProtocolText("<<SYS_TASK>>\nDo it.\n<<END_SYS_TASK>>"))
      .toBe(true);
    expect(
      isTaskTargetedProtocolText(
        "<<SYS_GPT_RESPONSE>>\nBODY: Done.\n<<END_SYS_GPT_RESPONSE>>"
      )
    ).toBe(true);
    expect(
      isTaskTargetedProtocolText(
        "<<SYS_USER_RESPONSE>>\nBODY: Answer.\n<<END_SYS_USER_RESPONSE>>"
      )
    ).toBe(true);
    expect(
      isTaskTargetedProtocolText(
        "<<SYS_TASK_CONFIRM>>\nSTATUS: RUNNING\n<<END_SYS_TASK_CONFIRM>>"
      )
    ).toBe(true);
    expect(
      isTaskTargetedProtocolText(
        "<<SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>\nBODY: transcript\n<<END_SYS_YOUTUBE_TRANSCRIPT_RESPONSE>>"
      )
    ).toBe(true);
    expect(
      isTaskTargetedProtocolText(
        "<<SYS_LIBRARY_DATA_RESPONSE>>\nBODY: refs\n<<END_SYS_LIBRARY_DATA_RESPONSE>>"
      )
    ).toBe(true);
    expect(
      isTaskTargetedProtocolText(
        "<<SYS_INFO>>\nTITLE: Notice\n<<END_SYS_INFO>>"
      )
    ).toBe(false);
  });

  it("advances multipart input only after every selected Kin acknowledges", async () => {
    const setPendingKinInjectionIndex = vi.fn();
    const setKinInput = vi.fn();

    await applyMultiKinPendingInjectionAction({
      text: "<<SYS_INFO>>\nPART: 1/2\nA\n<<END_SYS_INFO>>",
      replies: [
        "<<SYS_KIN_RESPONSE>>Received. Send the next.<<END_SYS_KIN_RESPONSE>>",
        "<<SYS_KIN_RESPONSE>>Received. Send the next.<<END_SYS_KIN_RESPONSE>>",
      ],
      pendingKinInjectionBlocks: [
        "<<SYS_INFO>>\nPART: 1/2\nA\n<<END_SYS_INFO>>",
        "<<SYS_INFO>>\nPART: 2/2\nB\n<<END_SYS_INFO>>",
      ],
      pendingKinInjectionIndex: 0,
      pendingKinInjectionPurpose: "info_share",
      setPendingKinInjectionIndex,
      setKinInput,
      clearPendingKinInjection: vi.fn(),
    });

    expect(setPendingKinInjectionIndex).toHaveBeenCalledWith(1);
    expect(setKinInput).toHaveBeenCalledWith(
      "<<SYS_INFO>>\nPART: 2/2\nB\n<<END_SYS_INFO>>"
    );
  });

  it("waits when any selected Kin has not acknowledged the multipart part", async () => {
    const setPendingKinInjectionIndex = vi.fn();
    const setKinInput = vi.fn();

    await applyMultiKinPendingInjectionAction({
      text: "<<SYS_INFO>>\nPART: 1/2\nA\n<<END_SYS_INFO>>",
      replies: [
        "<<SYS_KIN_RESPONSE>>Received. Send the next.<<END_SYS_KIN_RESPONSE>>",
        "I will start now.",
      ],
      pendingKinInjectionBlocks: [
        "<<SYS_INFO>>\nPART: 1/2\nA\n<<END_SYS_INFO>>",
        "<<SYS_INFO>>\nPART: 2/2\nB\n<<END_SYS_INFO>>",
      ],
      pendingKinInjectionIndex: 0,
      pendingKinInjectionPurpose: "info_share",
      setPendingKinInjectionIndex,
      setKinInput,
      clearPendingKinInjection: vi.fn(),
    });

    expect(setPendingKinInjectionIndex).not.toHaveBeenCalled();
    expect(setKinInput).not.toHaveBeenCalled();
  });

  it("advances non-final multipart input on receipt-only replies", async () => {
    const setPendingKinInjectionIndex = vi.fn();
    const setKinInput = vi.fn();

    await applyMultiKinPendingInjectionAction({
      text: "<<SYS_INFO>>\nPART: 1/2\nA\n<<END_SYS_INFO>>",
      replies: [
        "<<SYS_KIN_RESPONSE>>Received.<<END_SYS_KIN_RESPONSE>>",
        "<<SYS_KIN_RESPONSE>>Received.<<END_SYS_KIN_RESPONSE>>",
      ],
      pendingKinInjectionBlocks: [
        "<<SYS_INFO>>\nPART: 1/2\nA\n<<END_SYS_INFO>>",
        "<<SYS_INFO>>\nPART: 2/2\nB\n<<END_SYS_INFO>>",
      ],
      pendingKinInjectionIndex: 0,
      pendingKinInjectionPurpose: "info_share",
      setPendingKinInjectionIndex,
      setKinInput,
      clearPendingKinInjection: vi.fn(),
    });

    expect(setPendingKinInjectionIndex).toHaveBeenCalledWith(1);
    expect(setKinInput).toHaveBeenCalledWith(
      "<<SYS_INFO>>\nPART: 2/2\nB\n<<END_SYS_INFO>>"
    );
  });

  it("does not advance multipart input when a target failed without a reply", async () => {
    const setPendingKinInjectionIndex = vi.fn();
    const setKinInput = vi.fn();

    await applyMultiKinPendingInjectionAction({
      text: "<<SYS_INFO>>\nPART: 1/2\nA\n<<END_SYS_INFO>>",
      replies: [
        "<<SYS_KIN_RESPONSE>>Received.<<END_SYS_KIN_RESPONSE>>",
        "",
      ],
      pendingKinInjectionBlocks: [
        "<<SYS_INFO>>\nPART: 1/2\nA\n<<END_SYS_INFO>>",
        "<<SYS_INFO>>\nPART: 2/2\nB\n<<END_SYS_INFO>>",
      ],
      pendingKinInjectionIndex: 0,
      pendingKinInjectionPurpose: "info_share",
      setPendingKinInjectionIndex,
      setKinInput,
      clearPendingKinInjection: vi.fn(),
    });

    expect(setPendingKinInjectionIndex).not.toHaveBeenCalled();
    expect(setKinInput).not.toHaveBeenCalled();
  });
});

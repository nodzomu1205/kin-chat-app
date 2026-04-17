import { describe, expect, it, vi } from "vitest";
import { applyCompiledTaskPromptToKinInput } from "@/lib/app/kinTaskInjection";

describe("kinTaskInjection", () => {
  it("sets the first block and clears pending blocks for a single-part prompt", () => {
    const setPendingKinInjectionBlocks = vi.fn();
    const setPendingKinInjectionIndex = vi.fn();
    const setKinInput = vi.fn();

    const result = applyCompiledTaskPromptToKinInput({
      compiledTaskPrompt: "<<SYS_TASK>>\nBODY: Single part.\n<<END_SYS_TASK>>",
      setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex,
      setKinInput,
    });

    expect(result.partCount).toBe(1);
    expect(setPendingKinInjectionBlocks).toHaveBeenCalledWith([]);
    expect(setPendingKinInjectionIndex).toHaveBeenCalledWith(0);
    expect(setKinInput).toHaveBeenCalledWith(
      "<<SYS_TASK>>\nBODY: Single part.\n<<END_SYS_TASK>>"
    );
  });
});

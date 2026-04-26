import {
  buildPendingKinInjectionBlocks,
  DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES,
} from "@/lib/app/kin-protocol/kinMultipart";

export function applyCompiledTaskPromptToKinInput(args: {
  compiledTaskPrompt: string;
  setPendingKinInjectionBlocks: (blocks: string[]) => void;
  setPendingKinInjectionIndex: (index: number) => void;
  setPendingKinInjectionPurpose?: (purpose: "none" | "task_context") => void;
  setKinInput: (value: string) => void;
}) {
  const allBlocks = buildPendingKinInjectionBlocks(args.compiledTaskPrompt, {
    noticeLines: DEFAULT_KIN_TASK_MULTIPART_NOTICE_LINES,
  });
  const firstBlock = allBlocks[0] ?? args.compiledTaskPrompt;

  args.setPendingKinInjectionBlocks(allBlocks.length > 1 ? allBlocks : []);
  args.setPendingKinInjectionIndex(0);
  args.setPendingKinInjectionPurpose?.(
    allBlocks.length > 1 ? "task_context" : "none"
  );
  args.setKinInput(firstBlock);

  return {
    firstBlock,
    partCount: allBlocks.length,
  };
}

import {
  buildPendingKinInjectionBlocks,
  DEFAULT_KIN_INFO_MULTIPART_NOTICE_LINES,
  type PendingKinInjectionPurpose,
} from "@/lib/app/kin-protocol/kinMultipart";

export function applyKinSysInfoInjection(args: {
  text: string;
  setKinInput: (value: string) => void;
  setPendingKinInjectionBlocks: (blocks: string[]) => void;
  setPendingKinInjectionIndex: (index: number) => void;
  setPendingKinInjectionPurpose?: (purpose: PendingKinInjectionPurpose) => void;
  purpose?: Exclude<PendingKinInjectionPurpose, "none">;
}) {
  const blocks = buildPendingKinInjectionBlocks(args.text, {
    noticeLines: DEFAULT_KIN_INFO_MULTIPART_NOTICE_LINES,
    wrapperName: "SYS_INFO",
  });

  args.setKinInput(blocks[0] || args.text);
  args.setPendingKinInjectionBlocks(blocks.length > 1 ? blocks : []);
  args.setPendingKinInjectionIndex(0);
  args.setPendingKinInjectionPurpose?.(
    blocks.length > 1 ? args.purpose ?? "info_share" : "none"
  );

  return {
    firstBlock: blocks[0] || args.text,
    partCount: blocks.length,
  };
}

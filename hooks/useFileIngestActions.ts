import { runFileIngestFlow } from "@/lib/app/ingest/fileIngestFlow";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import type { UseFileIngestActionsArgs } from "@/hooks/chatPageActionTypes";

function buildRunFileIngestFlowArgs(
  args: UseFileIngestActionsArgs,
  file: File,
  options: {
    kind: UploadKind;
    mode: IngestMode;
    detail: ImageDetail;
    readPolicy: FileReadPolicy;
    compactCharLimit: number;
    simpleImageCharLimit: number;
  }
) {
  return {
    file,
    options,
    ingestLoading: args.ingestLoading,
    currentTaskDraft: args.currentTaskDraft,
    autoCopyFileIngestSysInfoToKin: args.autoCopyFileIngestSysInfoToKin,
    autoGenerateLibrarySummary: args.autoGenerateLibrarySummary,
    gptStateRef: args.gptMemoryRuntime.gptStateRef,
    chatRecentLimit: args.gptMemoryRuntime.chatRecentLimit,
    setIngestLoading: args.setIngestLoading,
    setGptMessages: args.setGptMessages,
    setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
    setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
    setPendingKinInjectionPurpose: args.setPendingKinInjectionPurpose,
    setKinInput: args.setKinInput,
    setUploadKind: args.setUploadKind,
    setGptInput: args.setGptInput,
    setGptState: args.gptMemoryRuntime.setGptState,
    persistCurrentGptState: args.gptMemoryRuntime.persistCurrentGptState,
    applyIngestUsage: args.applyIngestUsage,
    recordIngestedDocument: args.recordIngestedDocument,
    setActiveTabToKin: args.focusKinPanel,
  };
}

export function useFileIngestActions(args: UseFileIngestActionsArgs) {
  const injectFileToKinDraft = async (
    file: File,
    options: {
      kind: UploadKind;
      mode: IngestMode;
      detail: ImageDetail;
      readPolicy: FileReadPolicy;
      compactCharLimit: number;
      simpleImageCharLimit: number;
    }
  ) => {
    await runFileIngestFlow(buildRunFileIngestFlowArgs(args, file, options));
  };

  return {
    injectFileToKinDraft,
  };
}

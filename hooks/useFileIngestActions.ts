import { runFileIngestFlow } from "@/lib/app/fileIngestFlow";
import {
  resolveTransformIntent,
  shouldTransformContent,
  transformTextWithIntent,
} from "@/lib/app/transformIntent";
import type {
  FileReadPolicy,
  ImageDetail,
  IngestMode,
  PostIngestAction,
  UploadKind,
} from "@/components/panels/gpt/gptPanelTypes";
import type { UseFileIngestActionsArgs } from "@/hooks/chatPageActionTypes";

export function useFileIngestActions(args: UseFileIngestActionsArgs) {
  const injectFileToKinDraft = async (
    file: File,
    options: {
      kind: UploadKind;
      mode: IngestMode;
      detail: ImageDetail;
      action: PostIngestAction;
      readPolicy: FileReadPolicy;
      compactCharLimit: number;
      simpleImageCharLimit: number;
    }
  ) => {
    await runFileIngestFlow({
      file,
      options,
      ingestLoading: args.ingestLoading,
      responseMode: args.responseMode,
      gptInput: args.gptInput,
      currentTaskDraft: args.currentTaskDraft,
      autoCopyFileIngestSysInfoToKin: args.autoCopyFileIngestSysInfoToKin,
      gptStateRef: args.gptMemoryRuntime.gptStateRef,
      chatRecentLimit: args.gptMemoryRuntime.chatRecentLimit,
      setIngestLoading: args.setIngestLoading,
      setGptMessages: args.setGptMessages,
      setPendingKinInjectionBlocks: args.setPendingKinInjectionBlocks,
      setPendingKinInjectionIndex: args.setPendingKinInjectionIndex,
      setKinInput: args.setKinInput,
      setUploadKind: args.setUploadKind,
      setGptInput: args.setGptInput,
      setGptState: args.gptMemoryRuntime.setGptState,
      persistCurrentGptState: args.gptMemoryRuntime.persistCurrentGptState,
      setCurrentTaskDraft: args.setCurrentTaskDraft,
      applyIngestUsage: args.applyIngestUsage,
      applyTaskUsage: args.applyTaskUsage,
      recordIngestedDocument: args.recordIngestedDocument,
      resolveTransformIntent: ({ input, defaultMode, responseMode }) =>
        resolveTransformIntent({ input, defaultMode, responseMode }),
      shouldTransformContent,
      transformTextWithIntent: ({ text, intent, responseMode }) =>
        transformTextWithIntent({ text, intent, responseMode }),
      getTaskBaseText: args.getTaskBaseText,
      getResolvedTaskTitle: args.getResolvedTaskTitle,
      resolveTaskTitleFromDraft: args.resolveTaskTitleFromDraft,
      setActiveTabToKin: args.isMobile ? () => args.setActiveTab("kin") : undefined,
    });
  };

  return {
    injectFileToKinDraft,
  };
}

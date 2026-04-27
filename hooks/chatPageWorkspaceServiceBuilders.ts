import type {
  ChatPageWorkspaceCompositionServices,
  ChatPageWorkspaceServicesGpt,
  ChatPageWorkspaceServicesProtocol,
  ChatPageWorkspaceServicesReferences,
  ChatPageWorkspaceServicesSearch,
  ChatPageWorkspaceServicesTask,
  ChatPageWorkspaceServicesUsage,
} from "@/hooks/chatPageWorkspaceCompositionTypes";

function buildWorkspaceServicesTask(args: ChatPageWorkspaceServicesTask) {
  return {
    getTaskBaseText: args.getTaskBaseText,
    getTaskLibraryItem: args.getTaskLibraryItem,
    getResolvedTaskTitle: args.getResolvedTaskTitle,
    resolveTaskTitleFromDraft: args.resolveTaskTitleFromDraft,
    getTaskSlotLabel: args.getTaskSlotLabel,
    syncTaskDraftFromProtocol: args.syncTaskDraftFromProtocol,
    syncTaskRegistrationDraftFromProtocol:
      args.syncTaskRegistrationDraftFromProtocol,
    applyPrefixedTaskFieldsFromText: args.applyPrefixedTaskFieldsFromText,
    getCurrentTaskCharConstraint: args.getCurrentTaskCharConstraint,
    taskProtocol: args.taskProtocol,
    taskProtocolView: args.taskProtocolView,
  } satisfies ChatPageWorkspaceServicesTask;
}

function buildWorkspaceServicesProtocol(args: ChatPageWorkspaceServicesProtocol) {
  return {
    chatBridgeSettings: args.chatBridgeSettings,
    promptDefaultKey: args.promptDefaultKey,
    rulebookDefaultKey: args.rulebookDefaultKey,
  } satisfies ChatPageWorkspaceServicesProtocol;
}

function buildWorkspaceServicesSearch(args: ChatPageWorkspaceServicesSearch) {
  return {
    processMultipartTaskDoneText: args.processMultipartTaskDoneText,
    recordSearchContext: args.recordSearchContext,
    getContinuationTokenForSeries: args.getContinuationTokenForSeries,
    getAskAiModeLinkForQuery: args.getAskAiModeLinkForQuery,
  } satisfies ChatPageWorkspaceServicesSearch;
}

function buildWorkspaceServicesReferences(
  args: ChatPageWorkspaceServicesReferences
) {
  return {
    buildLibraryReferenceContext: args.buildLibraryReferenceContext,
    applyRegisteredTaskRuntimeSettings:
      args.applyRegisteredTaskRuntimeSettings,
  } satisfies ChatPageWorkspaceServicesReferences;
}

function buildWorkspaceServicesGpt(args: ChatPageWorkspaceServicesGpt) {
  return {
    gptMemoryRuntime: args.gptMemoryRuntime,
    gptMemorySettingsControls: args.gptMemorySettingsControls,
  } satisfies ChatPageWorkspaceServicesGpt;
}

function buildWorkspaceServicesUsage(args: ChatPageWorkspaceServicesUsage) {
  return {
    applySearchUsage: args.applySearchUsage,
    applyChatUsage: args.applyChatUsage,
    applyCompressionUsage: args.applyCompressionUsage,
    applyTaskUsage: args.applyTaskUsage,
    applyIngestUsage: args.applyIngestUsage,
    recordIngestedDocument: args.recordIngestedDocument,
  } satisfies ChatPageWorkspaceServicesUsage;
}

export function buildChatPageWorkspaceServices(
  args: ChatPageWorkspaceCompositionServices
) {
  return {
    task: buildWorkspaceServicesTask(args.task),
    protocol: buildWorkspaceServicesProtocol(args.protocol),
    search: buildWorkspaceServicesSearch(args.search),
    references: buildWorkspaceServicesReferences(args.references),
    gpt: buildWorkspaceServicesGpt(args.gpt),
    usage: buildWorkspaceServicesUsage(args.usage),
  } satisfies ChatPageWorkspaceCompositionServices;
}



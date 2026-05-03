import {
  buildAskGptRequestBlock,
  buildDraftModificationRequestBlock,
  buildDraftPreparationRequestBlock,
  buildFileSaveRequestBlock,
  buildLibraryIndexResponseDraft,
  buildLibraryImageDataResponseDraft,
  buildLibraryItemResponseDraft,
  buildPptDesignRequestInstruction,
  buildSearchRequestInstruction,
  buildUserResponseRequestBlock,
} from "@/lib/app/send-to-gpt/sendToGptProtocolBuilders";
import { buildNormalizedRequestText } from "@/lib/app/send-to-gpt/sendToGptText";
import type {
  ParsedInputLike,
  PendingRequestLike,
  ProtocolTaskEventLike,
} from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";
import type { Message, ReferenceLibraryItem } from "@/types/chat";
import {
  extractDraftDocumentFromMessages,
  resolveDraftDocumentId,
} from "@/lib/app/send-to-gpt/draftDocumentResolver";

export function buildFinalRequestText(params: {
  rawText: string;
  parsedInput: ParsedInputLike;
  effectiveParsedSearchQuery: string;
  askGptEvent?: ProtocolTaskEventLike;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
  searchRequestEvent?: ProtocolTaskEventLike;
  currentTaskId?: string | null;
  effectiveSearchEngines: string[];
  effectiveSearchLocation: string;
  libraryIndexRequestEvent?: ProtocolTaskEventLike;
  libraryItemRequestEvent?: ProtocolTaskEventLike;
  libraryImageDataRequestEvent?: ProtocolTaskEventLike;
  pptDesignRequestEvent?: ProtocolTaskEventLike;
  draftPreparationRequestEvent?: ProtocolTaskEventLike;
  draftModificationRequestEvent?: ProtocolTaskEventLike;
  fileSaveRequestEvent?: ProtocolTaskEventLike;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  imageLibraryReferenceCount?: number;
  recentMessages?: Message[];
  taskContext?: string;
}) {
  const protocolOverrideText = buildProtocolOverrideRequestText({
    askGptEvent: params.askGptEvent,
    requestToAnswer: params.requestToAnswer,
    requestAnswerBody: params.requestAnswerBody,
    searchRequestEvent: params.searchRequestEvent,
    currentTaskId: params.currentTaskId,
    effectiveSearchEngines: params.effectiveSearchEngines,
    effectiveSearchLocation: params.effectiveSearchLocation,
    libraryIndexRequestEvent: params.libraryIndexRequestEvent,
    libraryItemRequestEvent: params.libraryItemRequestEvent,
    libraryImageDataRequestEvent: params.libraryImageDataRequestEvent,
    pptDesignRequestEvent: params.pptDesignRequestEvent,
    draftPreparationRequestEvent: params.draftPreparationRequestEvent,
    draftModificationRequestEvent: params.draftModificationRequestEvent,
    fileSaveRequestEvent: params.fileSaveRequestEvent,
    rawText: params.rawText,
    referenceLibraryItems: params.referenceLibraryItems,
    libraryIndexResponseCount: params.libraryIndexResponseCount,
    imageLibraryReferenceCount: params.imageLibraryReferenceCount,
    recentMessages: params.recentMessages,
    defaultText: buildNormalizedRequestText({
      rawText: params.rawText,
      parsedInput: params.parsedInput,
      effectiveParsedSearchQuery: params.effectiveParsedSearchQuery,
    }),
  });

  if (!params.taskContext) {
    return protocolOverrideText;
  }

  return `${params.taskContext}\n\n${protocolOverrideText}`;
}

export function buildProtocolOverrideRequestText(params: {
  askGptEvent?: ProtocolTaskEventLike;
  requestToAnswer?: PendingRequestLike | null;
  requestAnswerBody?: string;
  searchRequestEvent?: ProtocolTaskEventLike;
  currentTaskId?: string | null;
  effectiveSearchEngines: string[];
  effectiveSearchLocation: string;
  libraryIndexRequestEvent?: ProtocolTaskEventLike;
  libraryItemRequestEvent?: ProtocolTaskEventLike;
  libraryImageDataRequestEvent?: ProtocolTaskEventLike;
  pptDesignRequestEvent?: ProtocolTaskEventLike;
  draftPreparationRequestEvent?: ProtocolTaskEventLike;
  draftModificationRequestEvent?: ProtocolTaskEventLike;
  fileSaveRequestEvent?: ProtocolTaskEventLike;
  rawText: string;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
  imageLibraryReferenceCount?: number;
  recentMessages?: Message[];
  defaultText: string;
}) {
  if (params.askGptEvent) {
    return buildAskGptRequestBlock({
      taskId: params.askGptEvent.taskId || params.currentTaskId || "",
      actionId: params.askGptEvent.actionId || "",
      body: params.askGptEvent.body || "",
    });
  }

  if (params.requestToAnswer && params.requestAnswerBody) {
    return buildUserResponseRequestBlock({
      taskId: params.requestToAnswer.taskId,
      actionId: params.requestToAnswer.actionId,
      originalQuestion: params.requestToAnswer.body,
      answerBody: params.requestAnswerBody,
    });
  }

  if (params.searchRequestEvent) {
    const requestedMode = params.searchRequestEvent.outputMode || "summary";
    return buildSearchRequestInstruction({
      taskId: params.searchRequestEvent.taskId || params.currentTaskId || "",
      actionId: params.searchRequestEvent.actionId || "",
      query: params.searchRequestEvent.query || params.searchRequestEvent.body || "",
      engine: params.searchRequestEvent.searchEngine || params.effectiveSearchEngines[0] || "",
      location:
        params.searchRequestEvent.searchLocation || params.effectiveSearchLocation || "",
      requestedMode,
      goal:
        params.searchRequestEvent.body ||
        params.searchRequestEvent.summary ||
        "Use the search query directly.",
    });
  }

  if (params.libraryIndexRequestEvent) {
    return buildLibraryIndexResponseDraft({
      taskId: params.libraryIndexRequestEvent.taskId || params.currentTaskId || "",
      actionId: params.libraryIndexRequestEvent.actionId || "",
      referenceLibraryItems: params.referenceLibraryItems,
      libraryIndexResponseCount: params.libraryIndexResponseCount,
    });
  }

  if (params.libraryItemRequestEvent) {
    return buildLibraryItemResponseDraft({
      taskId: params.libraryItemRequestEvent.taskId || params.currentTaskId || "",
      actionId: params.libraryItemRequestEvent.actionId || "",
      rawText: params.rawText,
      referenceLibraryItems: params.referenceLibraryItems,
    });
  }

  if (params.libraryImageDataRequestEvent) {
    return buildLibraryImageDataResponseDraft({
      taskId:
        params.libraryImageDataRequestEvent.taskId || params.currentTaskId || "",
      actionId: params.libraryImageDataRequestEvent.actionId || "",
      referenceLibraryItems: params.referenceLibraryItems,
      imageLibraryReferenceCount: params.imageLibraryReferenceCount ?? 0,
    });
  }

  if (params.pptDesignRequestEvent) {
    return buildPptDesignRequestInstruction({
      taskId: params.pptDesignRequestEvent.taskId || params.currentTaskId || "",
      actionId: params.pptDesignRequestEvent.actionId || "",
      body:
        params.pptDesignRequestEvent.body ||
        params.pptDesignRequestEvent.summary ||
        params.rawText,
    });
  }

  if (params.draftPreparationRequestEvent) {
    return buildDraftPreparationRequestBlock({
      taskId:
        params.draftPreparationRequestEvent.taskId || params.currentTaskId || "",
      actionId: params.draftPreparationRequestEvent.actionId || "",
      body:
        params.draftPreparationRequestEvent.body ||
        params.draftPreparationRequestEvent.summary ||
        params.rawText,
    });
  }

  if (params.draftModificationRequestEvent) {
    const recentMessages = params.recentMessages || [];
    const documentId = resolveDraftDocumentId({
      requestedDocumentId: params.draftModificationRequestEvent.documentId,
      messages: recentMessages,
    });
    const document = documentId
      ? extractDraftDocumentFromMessages({
          messages: recentMessages,
          documentId,
        })
      : null;

    return buildDraftModificationRequestBlock({
      taskId:
        params.draftModificationRequestEvent.taskId || params.currentTaskId || "",
      actionId: params.draftModificationRequestEvent.actionId || "",
      documentId,
      responseMode: params.draftModificationRequestEvent.responseMode,
      body:
        params.draftModificationRequestEvent.body ||
        params.draftModificationRequestEvent.summary ||
        params.rawText,
      documentTitle: document?.title,
      documentText: document?.text,
    });
  }

  if (params.fileSaveRequestEvent) {
    return buildFileSaveRequestBlock({
      taskId: params.fileSaveRequestEvent.taskId || params.currentTaskId || "",
      actionId: params.fileSaveRequestEvent.actionId || "",
      documentId: params.fileSaveRequestEvent.documentId || "",
      body:
        params.fileSaveRequestEvent.body ||
        params.fileSaveRequestEvent.summary ||
        params.rawText,
    });
  }

  return params.defaultText;
}

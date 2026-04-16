import {
  buildAskGptRequestBlock,
  buildLibraryIndexResponseDraft,
  buildLibraryItemResponseDraft,
  buildSearchRequestInstruction,
  buildUserResponseRequestBlock,
} from "@/lib/app/sendToGptProtocolBuilders";
import { buildNormalizedRequestText } from "@/lib/app/sendToGptText";
import type {
  ParsedInputLike,
  PendingRequestLike,
  ProtocolTaskEventLike,
} from "@/lib/app/sendToGptFlowTypes";
import type { ReferenceLibraryItem } from "@/types/chat";

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
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
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
    rawText: params.rawText,
    referenceLibraryItems: params.referenceLibraryItems,
    libraryIndexResponseCount: params.libraryIndexResponseCount,
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
  rawText: string;
  referenceLibraryItems: ReferenceLibraryItem[];
  libraryIndexResponseCount: number;
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

  return params.defaultText;
}

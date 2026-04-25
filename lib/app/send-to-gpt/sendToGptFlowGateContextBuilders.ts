import type {
  InlineUrlGateContext,
  MultipartImportGateContext,
  PreparedRequestGateContext,
  ProtocolLimitViolationGateContext,
  TaskDirectiveOnlyGateContext,
  YoutubeTranscriptGateContext,
} from "@/lib/app/send-to-gpt/sendToGptPreparedRequestTypes";
import type { ParsedInputLike } from "@/lib/app/send-to-gpt/sendToGptFlowBaseTypes";

export function buildMultipartImportGateContext(args: {
  rawText: string;
  processMultipartTaskDoneText: (
    text: string,
    options?: { setGptTab?: boolean }
  ) => { handled: boolean; accepted: boolean } | null;
}): MultipartImportGateContext {
  return {
    multipartHandled: !!args.processMultipartTaskDoneText(args.rawText, {
      setGptTab: true,
    }),
  };
}

export function buildInlineUrlGateContext(args: {
  rawText: string;
  extractInlineUrlTarget: (text: string) => string | null;
}): InlineUrlGateContext {
  return {
    inlineUrlTarget: args.extractInlineUrlTarget(args.rawText),
  };
}

export function buildTaskDirectiveOnlyGateContext(args: {
  preparedRequest: PreparedRequestGateContext;
  shouldRespondToTaskDirectiveOnlyInput: (params: {
    parsedInput: ParsedInputLike;
    effectiveParsedSearchQuery: string;
  }) => boolean;
}): TaskDirectiveOnlyGateContext {
  return {
    isTaskDirectiveOnly: args.shouldRespondToTaskDirectiveOnlyInput({
      parsedInput: args.preparedRequest.parsedInput,
      effectiveParsedSearchQuery: args.preparedRequest.effectiveParsedSearchQuery,
    }),
  };
}

export function buildProtocolLimitViolationGateContext(args: {
  preparedRequest: PreparedRequestGateContext;
}): ProtocolLimitViolationGateContext {
  return {
    limitViolation: args.preparedRequest.limitViolation,
    userMsg: args.preparedRequest.userMsg,
  };
}

export function buildYoutubeTranscriptGateContext(args: {
  preparedRequest: PreparedRequestGateContext;
}): YoutubeTranscriptGateContext {
  return {
    youtubeTranscriptRequestEvent:
      args.preparedRequest.youtubeTranscriptRequestEvent,
    userMsg: args.preparedRequest.userMsg,
  };
}

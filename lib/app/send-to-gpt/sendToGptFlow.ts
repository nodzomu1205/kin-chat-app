import {
  runPrePreparationGates,
  runPreparedRequestGates,
} from "@/lib/app/send-to-gpt/sendToGptFlowGuards";
import {
  getTaskDirectiveOnlyResponseText,
  shouldRespondToTaskDirectiveOnlyInput,
} from "@/lib/app/send-to-gpt/sendToGptText";
import type {
  RunSendToGptFlowArgs,
} from "@/lib/app/send-to-gpt/sendToGptFlowArgTypes";
import { extractInlineUrlTarget } from "@/lib/app/send-to-gpt/sendToGptShortcutFlows";
import { requestGptAssistantArtifacts } from "@/lib/app/send-to-gpt/sendToGptFlowRequest";
import { finalizeSendToGptFlow } from "@/lib/app/send-to-gpt/sendToGptFlowFinalize";
import { resolveSendToGptFlowStart } from "@/lib/app/send-to-gpt/sendToGptFlowDecisionState";
import { runImageGptCommandFlow } from "@/lib/app/image/imageGptFlow";
import { runPresentationGptCommandFlow } from "@/lib/app/presentation/presentationGptFlow";
import { parsePptCommand } from "@/lib/app/presentation/presentationCommandParser";
import { runSavedDocumentEditFlow } from "@/lib/app/reference-library/savedDocumentEditFlow";
import { parseTaskInput } from "@/lib/task/taskInputParser";
import {
  appendSendToGptFailureMessage,
  applySendToGptRequestStart,
} from "@/lib/app/send-to-gpt/sendToGptFlowState";
import { generateId } from "@/lib/shared/uuid";
import {
  buildSendToGptFlowPreparedPhase,
  buildSendToGptPrePreparationGateArgs,
  buildSendToGptFlowStepArgs,
  buildSendToGptFinalizeArgs,
} from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { Message } from "@/types/chat";

const DB_REFERENCE_RECENT_MESSAGE_LIMIT = 6;
const DB_REFERENCE_MAX_QUERY_CHARS = 2200;
const DB_REFERENCE_MAX_MESSAGE_CHARS = 280;

export async function runSendToGptFlow(args: RunSendToGptFlowArgs) {
  const startDecision = resolveSendToGptFlowStart({
    gptInput: args.gptInput,
    gptLoading: args.gptLoading,
  });
  if (startDecision.type === "skip") return;

  const { rawText } = startDecision;
  const flowArgs = buildSendToGptFlowStepArgs({
    ...args,
    extractInlineUrlTarget,
    shouldRespondToTaskDirectiveOnlyInput,
    taskDirectiveOnlyResponseText: getTaskDirectiveOnlyResponseText(),
  });

  if (
    await runPrePreparationGates(
      buildSendToGptPrePreparationGateArgs({
        flowArgs,
        rawText,
      })
    )
  ) {
    return;
  }

  args.setGptInput("");
  args.setGptLoading(true);
  const shouldAppendUserMessageBeforeContext = shouldShowUserMessageBeforeContext(rawText);
  if (shouldAppendUserMessageBeforeContext) {
    args.setGptMessages((prev) => [
      ...prev,
      {
        id: generateId(),
        role: "user",
        text: rawText,
      },
    ]);
  }

  try {
    const shouldUseDbReference = shouldUseDbReferenceForInput(rawText);
    const dbReferenceQuery = shouldUseDbReference
      ? buildDbReferenceQuery({
          currentInput: rawText,
          recentMessages:
            flowArgs.recentChatMessages ||
            flowArgs.gptStateRef.current.recentMessages ||
            [],
        })
      : rawText;
    const libraryReferenceContext =
      shouldUseDbReference && flowArgs.buildLibraryReferenceContextForQuery
        ? await flowArgs.buildLibraryReferenceContextForQuery(dbReferenceQuery, {
            originalQuery: rawText,
          })
        : flowArgs.buildLibraryReferenceContext();
    const flowArgsWithResolvedLibraryContext = {
      ...flowArgs,
      buildLibraryReferenceContext: () => libraryReferenceContext,
    };
    const preparedFlowPhase = buildSendToGptFlowPreparedPhase({
      flowArgs: flowArgsWithResolvedLibraryContext,
      rawText,
    });

    if (await runPreparedRequestGates(preparedFlowPhase.preparedRequestGateArgs)) {
      return;
    }
    const {
      preparedRequestBundle: { preparedRequestContexts },
      executionBundle,
    } = preparedFlowPhase;

    if (
      await runImageGptCommandFlow({
        rawText,
        flowArgs: flowArgsWithResolvedLibraryContext,
      })
    ) {
      return;
    }

    if (
      await runPresentationGptCommandFlow({
        rawText,
        flowArgs: flowArgsWithResolvedLibraryContext,
        assistantRequestArgs: executionBundle.assistantRequestArgs,
      })
    ) {
      return;
    }

    if (
      await runSavedDocumentEditFlow({
        rawText,
        flowArgs: flowArgsWithResolvedLibraryContext,
      })
    ) {
      return;
    }

    if (!shouldAppendUserMessageBeforeContext) {
      applySendToGptRequestStart(executionBundle.requestStartArgs);
    }

    const { data, assistantText, normalizedSources } =
      await requestGptAssistantArtifacts(executionBundle.assistantRequestArgs);

    await finalizeSendToGptFlow(
      buildSendToGptFinalizeArgs({
        flowArgs,
        preparedRequest: preparedRequestContexts.finalize,
        memoryContext: executionBundle.memoryContext,
        data,
        assistantText,
        normalizedSources,
      })
    );
  } catch (error) {
    console.error(error);
    appendSendToGptFailureMessage({
      setGptMessages: args.setGptMessages,
    });
  } finally {
    args.setGptLoading(false);
  }
}

function shouldShowUserMessageBeforeContext(rawText: string) {
  const trimmed = rawText.trim();
  return !trimmed.startsWith("/") && !trimmed.startsWith("<<SYS_");
}

export function buildDbReferenceQuery(params: {
  currentInput: string;
  recentMessages?: Message[];
}) {
  const currentInput = params.currentInput.trim();
  const recentMessages = (params.recentMessages || [])
    .filter((message) => message.text.trim())
    .slice(-DB_REFERENCE_RECENT_MESSAGE_LIMIT);

  if (!currentInput || recentMessages.length === 0) {
    return currentInput;
  }

  const contextLines = recentMessages.map((message) => {
    const role =
      message.role === "user"
        ? "User"
        : message.role === "gpt"
          ? "Assistant"
          : "Kin";
    return `${role}: ${truncateForDbReferenceQuery(message.text)}`;
  });
  const query = [
    "Current user message:",
    currentInput,
    "",
    "Recent conversation context:",
    ...contextLines,
  ].join("\n");

  return truncateForDbReferenceQuery(query, DB_REFERENCE_MAX_QUERY_CHARS);
}

function truncateForDbReferenceQuery(
  text: string,
  maxChars = DB_REFERENCE_MAX_MESSAGE_CHARS
) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, Math.max(0, maxChars - 1)).trim()}…`;
}

const DB_REFERENCE_ELIGIBLE_SYS_BLOCKS = new Set([
  "SYS_ASK_GPT",
  "SYS_PPT_DESIGN_REQUEST",
  "SYS_DRAFT_PREPARATION_REQUEST",
  "SYS_DRAFT_MODIFICATION_REQUEST",
]);

function extractLeadingSysBlockName(text: string) {
  return text.match(/^<<((?:SYS_)[A-Z_]+)>>/)?.[1] || "";
}

export function shouldUseDbReferenceForInput(rawText: string) {
  const trimmed = rawText.trim();
  if (!trimmed) return false;
  if (isPureInlineSearchInput(trimmed)) return false;
  if (trimmed.startsWith("<<SYS_")) {
    return DB_REFERENCE_ELIGIBLE_SYS_BLOCKS.has(
      extractLeadingSysBlockName(trimmed)
    );
  }
  const pptCommand = parsePptCommand(trimmed);
  if (
    pptCommand.isPptCommand &&
    (pptCommand.intent === "renderPptx" ||
      pptCommand.intent === "savePlan" ||
      pptCommand.intent === "resolveVisuals")
  ) {
    return false;
  }
  return true;
}

function isPureInlineSearchInput(rawText: string) {
  const parsed = parseTaskInput(rawText);
  return Boolean(
    parsed.searchQuery &&
      !parsed.freeText &&
      !parsed.title &&
      !parsed.userInstruction
  );
}

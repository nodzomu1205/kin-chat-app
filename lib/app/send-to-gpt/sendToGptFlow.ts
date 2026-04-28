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
import { runPresentationGptCommandFlow } from "@/lib/app/presentation/presentationGptFlow";
import {
  appendSendToGptFailureMessage,
  applySendToGptRequestStart,
} from "@/lib/app/send-to-gpt/sendToGptFlowState";
import {
  buildSendToGptFlowPreparedPhase,
  buildSendToGptFlowStepArgs,
  buildSendToGptFinalizeArgs,
} from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";

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
  const preparedFlowPhase = buildSendToGptFlowPreparedPhase({
    flowArgs,
    rawText,
  });

  if (await runPrePreparationGates(preparedFlowPhase.prePreparationGateArgs)) {
    return;
  }

  if (await runPreparedRequestGates(preparedFlowPhase.preparedRequestGateArgs)) {
    return;
  }
  const {
    preparedRequestBundle: { preparedRequestContexts },
    executionBundle,
  } = preparedFlowPhase;

  if (
    await runPresentationGptCommandFlow({
      rawText,
      flowArgs,
      assistantRequestArgs: executionBundle.assistantRequestArgs,
    })
  ) {
    return;
  }

  applySendToGptRequestStart(executionBundle.requestStartArgs);

  try {
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

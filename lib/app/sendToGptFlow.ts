import {
  runPrePreparationGates,
  runPreparedRequestGates,
} from "@/lib/app/sendToGptFlowGuards";
import {
  getTaskDirectiveOnlyResponseText,
  shouldRespondToTaskDirectiveOnlyInput,
} from "@/lib/app/sendToGptText";
import type {
  RunSendToGptFlowArgs,
} from "@/lib/app/sendToGptFlowTypes";
import { extractInlineUrlTarget } from "@/lib/app/sendToGptShortcutFlows";
import { requestGptAssistantArtifacts } from "@/lib/app/sendToGptFlowRequest";
import { finalizeSendToGptFlow } from "@/lib/app/sendToGptFlowFinalize";
import { resolveSendToGptFlowStart } from "@/lib/app/sendToGptFlowDecisionState";
import {
  appendSendToGptFailureMessage,
  applySendToGptRequestStart,
} from "@/lib/app/sendToGptFlowState";
import {
  buildSendToGptFlowPreparedPhase,
  buildSendToGptFlowStepArgs,
  buildSendToGptFinalizeArgs,
} from "@/lib/app/sendToGptFlowStepBuilders";

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

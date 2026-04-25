import {
  runAttachSearchResultToTaskFlow,
  runDeepenTaskFromLastFlow,
  runPrepTaskFromInputFlow,
  runUpdateTaskFromInputFlow,
  runUpdateTaskFromLastGptMessageFlow,
} from "@/lib/app/task-draft/taskDraftActionFlows";
import type { UseTaskDraftActionsArgs } from "@/hooks/chatPageActionTypes";
import {
  buildAttachSearchResultToTaskFlowArgs,
  buildDeepenTaskFromLastFlowArgs,
  buildPrepTaskFromInputFlowArgs,
  buildTaskDraftSearchContextResolver,
  buildUpdateTaskFromInputFlowArgs,
  buildUpdateTaskFromLastGptMessageFlowArgs,
} from "@/lib/app/task-draft/taskDraftFlowArgBuilders";

export function useTaskDraftActions(args: UseTaskDraftActionsArgs) {
  const getDraftSearchContext = buildTaskDraftSearchContextResolver(args);

  const runPrepTaskFromInput = async () => {
    await runPrepTaskFromInputFlow(
      buildPrepTaskFromInputFlowArgs(args, getDraftSearchContext)
    );
  };

  const runUpdateTaskFromInput = async () => {
    await runUpdateTaskFromInputFlow(
      buildUpdateTaskFromInputFlowArgs(args, getDraftSearchContext)
    );
  };

  const runUpdateTaskFromLastGptMessage = async () => {
    await runUpdateTaskFromLastGptMessageFlow(
      buildUpdateTaskFromLastGptMessageFlowArgs(args, getDraftSearchContext)
    );
  };

  const runAttachSearchResultToTask = async () => {
    await runAttachSearchResultToTaskFlow(
      buildAttachSearchResultToTaskFlowArgs(args, getDraftSearchContext)
    );
  };

  const runDeepenTaskFromLast = async () => {
    await runDeepenTaskFromLastFlow(
      buildDeepenTaskFromLastFlowArgs(args, getDraftSearchContext)
    );
  };

  return {
    runPrepTaskFromInput,
    runUpdateTaskFromInput,
    runUpdateTaskFromLastGptMessage,
    runAttachSearchResultToTask,
    runDeepenTaskFromLast,
  };
}

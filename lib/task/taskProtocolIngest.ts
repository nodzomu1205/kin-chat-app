import { toUserFacingRequests } from "@/lib/task/taskProgress";
import { applyTaskProtocolEvent } from "@/lib/task/taskProtocolRuntime";
import type { TaskProtocolEvent, TaskRuntimeState } from "@/types/taskProtocol";

type IngestTaskProtocolEventsParams = {
  direction: "kin_to_gpt" | "gpt_to_kin" | "user_to_kin" | "system";
  events: TaskProtocolEvent[];
  createActionId: () => string;
  now: () => number;
};

function isDuplicateProtocolLogEntry(params: {
  runtime: TaskRuntimeState;
  event: TaskProtocolEvent;
  resolvedTaskId: string;
}) {
  return params.runtime.protocolLog.find((entry) => {
    if (entry.taskId !== params.resolvedTaskId || entry.type !== params.event.type) {
      return false;
    }
    if (params.event.actionId) {
      return entry.body.includes(params.event.actionId);
    }
    return entry.body === (params.event.body || params.event.summary || "");
  });
}

export function ingestTaskProtocolEventsState(
  prev: TaskRuntimeState,
  params: IngestTaskProtocolEventsParams
): TaskRuntimeState {
  let next = { ...prev };

  for (const event of params.events) {
    if (event.type === "task_proposal") {
      continue;
    }
    const resolvedTaskId = event.taskId || next.currentTaskId || prev.currentTaskId || "";
    const actionId = event.actionId || params.createActionId();
    const existingLog = isDuplicateProtocolLogEntry({
      runtime: next,
      event,
      resolvedTaskId,
    });

    if (existingLog) {
      continue;
    }

    next = applyTaskProtocolEvent(next, event, {
      direction: params.direction,
      resolvedTaskId,
      actionId,
      now: params.now(),
    });
  }

  return {
    ...next,
    userFacingRequests: toUserFacingRequests(next.pendingRequests),
  };
}

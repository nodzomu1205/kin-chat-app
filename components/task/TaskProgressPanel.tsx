"use client";

import React from "react";
import { TASK_PROGRESS_TEXT } from "@/components/ui/commonUiText";
import type {
  TaskRequirementProgress,
  UserFacingTaskRequest,
} from "@/types/taskProtocol";

type Props = {
  taskId: string | null;
  taskTitle: string;
  goal: string;
  requirementProgress: TaskRequirementProgress[];
  userFacingRequests: UserFacingTaskRequest[];
  onAnswerRequest?: (requestId: string) => void;
};

function renderProgressText(item: TaskRequirementProgress) {
  if (typeof item.targetCount === "number") {
    return `${item.completedCount ?? 0}/${item.targetCount}`;
  }
  return item.status;
}

export default function TaskProgressPanel({
  taskId,
  taskTitle,
  goal,
  requirementProgress,
  userFacingRequests,
  onAnswerRequest,
}: Props) {
  const requiredItems = requirementProgress.filter((item) => item.category === "required");
  const optionalItems = requirementProgress.filter((item) => item.category === "optional");

  return (
    <div className="space-y-3 text-sm">
      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="text-xs text-slate-500">{TASK_PROGRESS_TEXT.currentTask}</div>
        <div className="mt-1 font-semibold text-slate-800">
          {taskId ? `#${taskId} ` : ""}
          {taskTitle || TASK_PROGRESS_TEXT.unset}
        </div>
        <div className="mt-2 text-xs text-slate-500">{TASK_PROGRESS_TEXT.goal}</div>
        <div className="mt-1 whitespace-pre-wrap text-slate-700">
          {goal || TASK_PROGRESS_TEXT.noGoal}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="font-semibold text-slate-800">{TASK_PROGRESS_TEXT.requiredProgress}</div>
        <div className="mt-2 space-y-2">
          {requiredItems.length === 0 ? (
            <div className="text-slate-500">{TASK_PROGRESS_TEXT.noItems}</div>
          ) : (
            requiredItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2"
              >
                <div className="text-slate-700">{item.label}</div>
                <div className="shrink-0 text-xs text-slate-500">
                  {renderProgressText(item)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="font-semibold text-slate-800">{TASK_PROGRESS_TEXT.optionalProgress}</div>
        <div className="mt-2 space-y-2">
          {optionalItems.length === 0 ? (
            <div className="text-slate-500">{TASK_PROGRESS_TEXT.noItems}</div>
          ) : (
            optionalItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2"
              >
                <div className="text-slate-700">{item.label}</div>
                <div className="shrink-0 text-xs text-slate-500">
                  {renderProgressText(item)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="font-semibold text-slate-800">{TASK_PROGRESS_TEXT.userRequests}</div>
        <div className="mt-2 space-y-2">
          {userFacingRequests.length === 0 ? (
            <div className="text-slate-500">{TASK_PROGRESS_TEXT.noRequests}</div>
          ) : (
            userFacingRequests.map((request) => (
              <div
                key={request.requestId}
                className="rounded-xl border border-slate-100 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-slate-700">
                    [{request.requestId}]{" "}
                    {request.kind === "question"
                      ? TASK_PROGRESS_TEXT.question
                      : TASK_PROGRESS_TEXT.materialRequest}
                  </div>
                  <div className="text-xs text-slate-500">{request.status}</div>
                </div>
                <div className="mt-1 whitespace-pre-wrap text-slate-700">{request.body}</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span>
                    {request.required
                      ? TASK_PROGRESS_TEXT.required
                      : TASK_PROGRESS_TEXT.optional}
                  </span>
                  {onAnswerRequest ? (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50"
                      onClick={() => onAnswerRequest(request.requestId)}
                    >
                      {TASK_PROGRESS_TEXT.answerThis}
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

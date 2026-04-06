"use client";

import React from "react";
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
  const requiredItems = requirementProgress.filter((x) => x.category === "required");
  const optionalItems = requirementProgress.filter((x) => x.category === "optional");

  return (
    <div className="space-y-3 text-sm">
      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="text-xs text-slate-500">現在タスク</div>
        <div className="mt-1 font-semibold text-slate-800">
          {taskId ? `#${taskId} ` : ""}
          {taskTitle || "未設定"}
        </div>
        <div className="mt-2 text-xs text-slate-500">ゴール</div>
        <div className="mt-1 whitespace-pre-wrap text-slate-700">
          {goal || "まだタスクがありません。"}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="font-semibold text-slate-800">必須要件</div>
        <div className="mt-2 space-y-2">
          {requiredItems.length === 0 ? (
            <div className="text-slate-500">なし</div>
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
        <div className="font-semibold text-slate-800">可能要件</div>
        <div className="mt-2 space-y-2">
          {optionalItems.length === 0 ? (
            <div className="text-slate-500">なし</div>
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
        <div className="font-semibold text-slate-800">ユーザーへの依頼</div>
        <div className="mt-2 space-y-2">
          {userFacingRequests.length === 0 ? (
            <div className="text-slate-500">現在はありません。</div>
          ) : (
            userFacingRequests.map((req) => (
              <div
                key={req.requestId}
                className="rounded-xl border border-slate-100 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-slate-700">
                    [{req.requestId}] {req.kind === "question" ? "確認" : "資料要求"}
                  </div>
                  <div className="text-xs text-slate-500">{req.status}</div>
                </div>
                <div className="mt-1 whitespace-pre-wrap text-slate-700">{req.body}</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span>{req.required ? "必須" : "任意"}</span>
                  {onAnswerRequest ? (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50"
                      onClick={() => onAnswerRequest(req.requestId)}
                    >
                      この依頼に回答
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
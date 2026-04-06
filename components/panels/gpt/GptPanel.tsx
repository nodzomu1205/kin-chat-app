"use client";

import React, { useMemo, useState } from "react";
import type {
  GptInstructionMode,
  GptPanelProps,
  TokenStats,
} from "@/components/panels/gpt/gptPanelTypes";


type TopTabKey = "memory" | "tokens" | "task_draft" | "task_progress";
type BottomTabKey = "chat" | "task_1" | "task_2";

function metricRow(label: string, input: number, output: number, total: number) {
  return { label, input, output, total };
}

function formatNumber(value: number | undefined) {
  return Intl.NumberFormat("ja-JP").format(value ?? 0);
}

function countText(done?: number, target?: number, fallback?: string) {
  if (typeof target === "number") return `${done ?? 0}/${target}`;
  return fallback ?? "-";
}

function TopTabButton(props: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-t-2xl border border-b-0 px-3 py-1.5 text-xs sm:text-sm ${
        props.active
          ? "bg-white text-slate-800 shadow-sm"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
    >
      {props.label}
    </button>
  );
}

function BottomTabButton(props: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-t-2xl border border-b-0 px-3 py-1.5 text-xs sm:text-sm ${
        props.active
          ? "bg-white text-slate-800 shadow-sm"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
      }`}
    >
      {props.label}
    </button>
  );
}

function ChatMessageList({
  gptMessages,
  gptBottomRef,
}: Pick<GptPanelProps, "gptMessages" | "gptBottomRef">) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
      <div className="space-y-3">
        {gptMessages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  isUser
                    ? "bg-sky-600 text-white"
                    : msg.role === "gpt"
                    ? "bg-slate-100 text-slate-800"
                    : "bg-violet-100 text-slate-800"
                }`}
              >
                {msg.text}
                {Array.isArray(msg.sources) && msg.sources.length > 0 ? (
                  <div className="mt-2 border-t border-slate-200 pt-2 text-xs text-slate-500">
                    🔗 参考リンク {msg.sources.length}件
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div ref={gptBottomRef} />
    </div>
  );
}

function MemoryPanel({
  gptState,
  memorySettings,
  defaultMemorySettings,
  onSaveMemorySettings,
  onResetMemorySettings,
}: Pick<
  GptPanelProps,
  "gptState" | "memorySettings" | "defaultMemorySettings" | "onSaveMemorySettings" | "onResetMemorySettings"
>) {
  const facts = gptState.memory?.facts ?? [];
  const preferences = gptState.memory?.preferences ?? [];
  const recentCount = gptState.recentMessages?.length ?? 0;
  const totalLimit =
    (memorySettings.chatRecentLimit ?? 0) +
    (memorySettings.maxFacts ?? 0) +
    (memorySettings.maxPreferences ?? 0);
  const totalUsed = recentCount + facts.length + preferences.length;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm">
      <div className="rounded-xl border border-slate-100 p-3">
        <div className="text-xs text-slate-500">メモリ占有</div>
        <div className="mt-1 font-semibold text-slate-800">
          合計 {totalUsed}/{totalLimit}
        </div>
        <div className="mt-2 text-xs text-slate-500">
          直近チャット {recentCount}/{memorySettings.chatRecentLimit} ・ ファクト {facts.length}/
          {memorySettings.maxFacts} ・ お気に入り {preferences.length}/{memorySettings.maxPreferences}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="rounded-xl border border-slate-100 p-3">
          <div className="text-xs text-slate-500">Chat recent limit</div>
          <input
            type="number"
            value={memorySettings.chatRecentLimit}
            onChange={(e) =>
              onSaveMemorySettings({
                ...memorySettings,
                chatRecentLimit: Number(e.target.value || 0),
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>

        <label className="rounded-xl border border-slate-100 p-3">
          <div className="text-xs text-slate-500">Summarize threshold</div>
          <input
            type="number"
            value={memorySettings.summarizeThreshold}
            onChange={(e) =>
              onSaveMemorySettings({
                ...memorySettings,
                summarizeThreshold: Number(e.target.value || 0),
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>

        <label className="rounded-xl border border-slate-100 p-3">
          <div className="text-xs text-slate-500">Recent keep</div>
          <input
            type="number"
            value={memorySettings.recentKeep}
            onChange={(e) =>
              onSaveMemorySettings({
                ...memorySettings,
                recentKeep: Number(e.target.value || 0),
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>

        <label className="rounded-xl border border-slate-100 p-3">
          <div className="text-xs text-slate-500">Max facts</div>
          <input
            type="number"
            value={memorySettings.maxFacts}
            onChange={(e) =>
              onSaveMemorySettings({
                ...memorySettings,
                maxFacts: Number(e.target.value || 0),
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>

        <label className="rounded-xl border border-slate-100 p-3 md:col-span-2">
          <div className="text-xs text-slate-500">Max preferences</div>
          <input
            type="number"
            value={memorySettings.maxPreferences}
            onChange={(e) =>
              onSaveMemorySettings({
                ...memorySettings,
                maxPreferences: Number(e.target.value || 0),
              })
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onSaveMemorySettings(defaultMemorySettings)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          初期値を反映
        </button>
        <button
          type="button"
          onClick={onResetMemorySettings}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          リセット
        </button>
      </div>
    </div>
  );
}

function TokenPanel({ tokenStats }: { tokenStats: TokenStats }) {
  const latestInput = tokenStats.latestInput ?? tokenStats.latest?.input ?? 0;
  const latestOutput = tokenStats.latestOutput ?? tokenStats.latest?.output ?? 0;
  const latestTotal = tokenStats.latestTotal ?? tokenStats.latest?.total ?? 0;
  const rolling5Input = tokenStats.rolling5Input ?? tokenStats.rolling5?.input ?? 0;
  const rolling5Output = tokenStats.rolling5Output ?? tokenStats.rolling5?.output ?? 0;
  const rolling5Total = tokenStats.rolling5Total ?? tokenStats.rolling5?.total ?? 0;
  const cumulativeInput = tokenStats.cumulativeInput ?? tokenStats.cumulative?.input ?? 0;
  const cumulativeOutput = tokenStats.cumulativeOutput ?? tokenStats.cumulative?.output ?? 0;
  const cumulativeTotal = tokenStats.cumulativeTotal ?? tokenStats.cumulative?.total ?? 0;

  const rows = [
    metricRow("直近1回", latestInput, latestOutput, latestTotal),
    metricRow("直近5回", rolling5Input, rolling5Output, rolling5Total),
    metricRow("累計", cumulativeInput, cumulativeOutput, cumulativeTotal),
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="px-2 py-2 font-medium">区分</th>
              <th className="px-2 py-2 font-medium">Input</th>
              <th className="px-2 py-2 font-medium">Output</th>
              <th className="px-2 py-2 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-slate-100 text-slate-700">
                <td className="px-2 py-2">{row.label}</td>
                <td className="px-2 py-2">{formatNumber(row.input)}</td>
                <td className="px-2 py-2">{formatNumber(row.output)}</td>
                <td className="px-2 py-2 font-medium">{formatNumber(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskDraftPanel(props: Pick<
  GptPanelProps,
  | "currentTaskDraft"
  | "onChangeTaskTitle"
  | "onChangeTaskUserInstruction"
  | "onChangeTaskBody"
>) {
  const { currentTaskDraft, onChangeTaskTitle, onChangeTaskUserInstruction, onChangeTaskBody } = props;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3">
      <label className="block">
        <div className="text-xs text-slate-500">タイトル</div>
        <input
          value={currentTaskDraft.title ?? ""}
          onChange={(e) => onChangeTaskTitle(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <div className="text-xs text-slate-500">追加指示</div>
        <textarea
          value={currentTaskDraft.userInstruction ?? ""}
          onChange={(e) => onChangeTaskUserInstruction(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <div className="text-xs text-slate-500">タスク本文</div>
        <textarea
          value={currentTaskDraft.body ?? ""}
          onChange={(e) => onChangeTaskBody(e.target.value)}
          rows={10}
          className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm whitespace-pre-wrap"
        />
      </label>
    </div>
  );
}

function TaskProgressPanel({
  taskProgressView,
  onAnswerTaskRequest,
}: Pick<GptPanelProps, "taskProgressView" | "onAnswerTaskRequest">) {
  if (!taskProgressView) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        まだ進行中のKinタスクはありません。
      </div>
    );
  }

  const requiredItems = taskProgressView.requirementProgress.filter((x) => x.category === "required");
  const optionalItems = taskProgressView.requirementProgress.filter((x) => x.category === "optional");

  return (
    <div className="space-y-3 text-sm">
      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="text-xs text-slate-500">現在タスク</div>
        <div className="mt-1 font-semibold text-slate-800">
          {taskProgressView.taskId ? `#${taskProgressView.taskId} ` : ""}
          {taskProgressView.taskTitle || "未設定"}
        </div>
        <div className="mt-2 text-xs text-slate-500">ゴール</div>
        <div className="mt-1 whitespace-pre-wrap text-slate-700">{taskProgressView.goal || "-"}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="font-semibold text-slate-800">必須要件</div>
        <div className="mt-2 space-y-2">
          {requiredItems.length === 0 ? (
            <div className="text-slate-500">なし</div>
          ) : (
            requiredItems.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                <div className="text-slate-700">{item.label}</div>
                <div className="shrink-0 text-xs text-slate-500">
                  {countText(item.completedCount, item.targetCount, item.status)}
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
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2">
                <div className="text-slate-700">{item.label}</div>
                <div className="shrink-0 text-xs text-slate-500">
                  {countText(item.completedCount, item.targetCount, item.status)}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3">
        <div className="font-semibold text-slate-800">ユーザーへの依頼</div>
        <div className="mt-2 space-y-2">
          {taskProgressView.userFacingRequests.length === 0 ? (
            <div className="text-slate-500">現在はありません。</div>
          ) : (
            taskProgressView.userFacingRequests.map((req) => (
              <div key={req.requestId} className="rounded-xl border border-slate-100 px-3 py-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium text-slate-700">
                    [{req.requestId}] {req.kind === "question" ? "確認" : "資料要求"}
                  </div>
                  <div className="text-xs text-slate-500">{req.status}</div>
                </div>
                <div className="mt-1 whitespace-pre-wrap text-slate-700">{req.body}</div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span>{req.required ? "必須" : "任意"}</span>
                  {onAnswerTaskRequest ? (
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 px-2 py-1 text-slate-700 hover:bg-slate-50"
                      onClick={() => onAnswerTaskRequest(req.requestId)}
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

function SelectRow<T extends string>(props: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="block">
      <div className="text-xs text-slate-500">{props.label}</div>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value as T)}
        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      >
        {props.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TaskActionBar(props: Pick<
  GptPanelProps,
  | "runPrepTaskFromInput"
  | "runDeepenTaskFromLast"
  | "runUpdateTaskFromInput"
  | "runUpdateTaskFromLastGptMessage"
  | "runAttachSearchResultToTask"
  | "sendCurrentTaskContentToKin"
  | "receiveLastKinResponseToGptInput"
  | "loading"
>) {
  const disabled = props.loading;
  const btn = "rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" className={btn} disabled={disabled} onClick={props.receiveLastKinResponseToGptInput}>レス取込</button>
      <button type="button" className={btn} disabled={disabled} onClick={props.runPrepTaskFromInput}>新規</button>
      <button type="button" className={btn} disabled={disabled} onClick={props.runDeepenTaskFromLast}>深堀り</button>
      <button type="button" className={btn} disabled={disabled} onClick={props.runUpdateTaskFromInput}>更新</button>
      <button type="button" className={btn} disabled={disabled} onClick={props.runUpdateTaskFromLastGptMessage}>レス内容</button>
      <button type="button" className={btn} disabled={disabled} onClick={props.runAttachSearchResultToTask}>検索統合</button>
      <button type="button" className={btn} disabled={disabled} onClick={props.sendCurrentTaskContentToKin}>Kinタスク</button>
    </div>
  );
}

export default function GptPanel(props: GptPanelProps) {
  const [topTab, setTopTab] = useState<TopTabKey>("task_draft");
  const [bottomTab, setBottomTab] = useState<BottomTabKey>("chat");

  const kinLabel = props.currentKinLabel || "未接続";
  const statusDot = props.kinStatus === "connected" ? "bg-emerald-500" : props.kinStatus === "error" ? "bg-rose-500" : "bg-slate-300";

  const taskSummary = useMemo(() => {
    return props.currentTaskDraft.taskName || props.currentTaskDraft.title || "タスク未設定";
  }, [props.currentTaskDraft.taskName, props.currentTaskDraft.title]);

  const sendMode = (mode: GptInstructionMode) => {
    void props.sendToGpt(mode);
  };

  const handlePickFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    await props.injectFileToKinDraft(file, {
      kind: props.uploadKind,
      mode: props.ingestMode,
      detail: props.imageDetail,
      action: props.postIngestAction,
      readPolicy: props.fileReadPolicy,
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 bg-violet-600 px-3 py-2 text-white">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="font-semibold">ChatGPT</div>
            <div className={`h-2.5 w-2.5 rounded-full ${statusDot}`} />
            <div className="truncate text-sm text-violet-100">{kinLabel}</div>
          </div>
          <div className="flex items-center gap-2">
            {props.isMobile ? (
              <button
                type="button"
                onClick={props.onSwitchPanel}
                className="rounded-xl bg-white/15 px-3 py-1.5 text-xs hover:bg-white/20"
              >
                Kinへ
              </button>
            ) : null}
            <button
              type="button"
              onClick={props.resetGptForCurrentKin}
              className="rounded-xl bg-white/15 px-3 py-1.5 text-xs hover:bg-white/20"
            >
              リセット
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-violet-100">
          <span>タスク: {taskSummary}</span>
          <span>注入: {props.pendingInjectionCurrentPart}/{props.pendingInjectionTotalParts || 0}</span>
          <span>Tokens ({formatNumber(props.tokenStats.latestTotal ?? props.tokenStats.latest?.total)})</span>
        </div>
      </div>

      <div className="flex gap-1 px-3 pt-2">
        <TopTabButton active={topTab === "memory"} label="メモリ" onClick={() => setTopTab("memory")} />
        <TopTabButton active={topTab === "tokens"} label="トークン" onClick={() => setTopTab("tokens")} />
        <TopTabButton active={topTab === "task_draft"} label="タスク整理" onClick={() => setTopTab("task_draft")} />
        <TopTabButton active={topTab === "task_progress"} label="タスク進捗" onClick={() => setTopTab("task_progress")} />
      </div>

      <div className="min-h-0 flex-1 px-3 pb-3">
        <div className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-3 min-h-[160px] shrink-0 overflow-y-auto">
            {topTab === "memory" ? (
              <MemoryPanel
                gptState={props.gptState}
                memorySettings={props.memorySettings}
                defaultMemorySettings={props.defaultMemorySettings}
                onSaveMemorySettings={props.onSaveMemorySettings}
                onResetMemorySettings={props.onResetMemorySettings}
              />
            ) : topTab === "tokens" ? (
              <TokenPanel tokenStats={props.tokenStats} />
            ) : topTab === "task_draft" ? (
              <TaskDraftPanel
                currentTaskDraft={props.currentTaskDraft}
                onChangeTaskTitle={props.onChangeTaskTitle}
                onChangeTaskUserInstruction={props.onChangeTaskUserInstruction}
                onChangeTaskBody={props.onChangeTaskBody}
              />
            ) : (
              <TaskProgressPanel
                taskProgressView={props.taskProgressView}
                onAnswerTaskRequest={props.onAnswerTaskRequest}
              />
            )}
          </div>

          <div className="mt-auto flex gap-1">
            <BottomTabButton active={bottomTab === "chat"} label="チャット" onClick={() => setBottomTab("chat")} />
            <BottomTabButton active={bottomTab === "task_1"} label="タスク①" onClick={() => setBottomTab("task_1")} />
            <BottomTabButton active={bottomTab === "task_2"} label="タスク②" onClick={() => setBottomTab("task_2")} />
          </div>

          <div className="mt-0 flex min-h-0 flex-1 flex-col rounded-b-2xl border border-slate-200 bg-slate-50 p-3">
            <ChatMessageList
              gptMessages={props.gptMessages}
              gptBottomRef={props.gptBottomRef}
            />

            <div className="mt-3 space-y-3">
              {bottomTab === "task_1" ? (
                <TaskActionBar
                  runPrepTaskFromInput={props.runPrepTaskFromInput}
                  runDeepenTaskFromLast={props.runDeepenTaskFromLast}
                  runUpdateTaskFromInput={props.runUpdateTaskFromInput}
                  runUpdateTaskFromLastGptMessage={props.runUpdateTaskFromLastGptMessage}
                  runAttachSearchResultToTask={props.runAttachSearchResultToTask}
                  sendCurrentTaskContentToKin={props.sendCurrentTaskContentToKin}
                  receiveLastKinResponseToGptInput={props.receiveLastKinResponseToGptInput}
                  loading={props.loading}
                />
              ) : bottomTab === "task_2" ? (
                <div className="flex flex-wrap gap-2">
                  {props.onStartKinTask ? (
                    <button type="button" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50" onClick={props.onStartKinTask} disabled={props.loading}>
                      Kinタスク開始
                    </button>
                  ) : null}
                  <button type="button" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50" onClick={props.sendLatestGptContentToKin} disabled={props.loading}>Kinに戻す</button>
                  <button type="button" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50" onClick={props.sendLastGptToKinDraft} disabled={props.loading}>戻し下書き</button>
                  <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 cursor-pointer disabled:opacity-50">
                    ファイル取込
                    <input type="file" className="hidden" onChange={handlePickFile} disabled={!props.canInjectFile} />
                  </label>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-5">
                <SelectRow label="応答" value={props.responseMode} options={["strict", "balanced", "creative"]} onChange={props.onChangeResponseMode} />
                <SelectRow label="Upload" value={props.uploadKind} options={["auto", "text", "image", "pdf", "mixed"]} onChange={props.onChangeUploadKind} />
                <SelectRow label="Ingest" value={props.ingestMode} options={["strict", "creative", "max"]} onChange={props.onChangeIngestMode} />
                <SelectRow label="Image detail" value={props.imageDetail} options={["low", "high", "auto"]} onChange={props.onChangeImageDetail} />
                <SelectRow
                  label="読込粒度"
                  value={props.fileReadPolicy}
                  options={["text_first", "visual_first", "text_and_layout"]}
                  onChange={props.onChangeFileReadPolicy}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <SelectRow label="Post ingest" value={props.postIngestAction} options={["inject_only", "inject_and_prep", "inject_prep_deepen", "attach_to_current_task"]} onChange={props.onChangePostIngestAction} />
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
                  取込状態: {props.ingestLoading ? "読込中" : "待機中"}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => sendMode("translate_explain")} disabled={props.loading} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">翻訳・解説</button>
                <button type="button" onClick={() => sendMode("reply_only")} disabled={props.loading} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">返信案</button>
                <button type="button" onClick={() => sendMode("polish")} disabled={props.loading} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">添削</button>
                <button type="button" onClick={() => sendMode("normal")} disabled={props.loading} className="rounded-xl bg-slate-900 px-4 py-2 text-xs sm:text-sm text-white hover:bg-slate-800 disabled:opacity-50">送信</button>
              </div>

              <textarea
                value={props.gptInput}
                onChange={(e) => props.setGptInput(e.target.value)}
                rows={props.isMobile ? 5 : 4}
                placeholder="ここに入力。TASK: で始めるとKinタスクとして扱いやすいです。"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

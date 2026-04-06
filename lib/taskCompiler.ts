import type { TaskIntent } from "@/types/taskProtocol";

export function compileKinTaskPrompt(params: {
  taskId: string;
  title: string;
  originalInstruction: string;
  intent: TaskIntent;
}): string {
  const { taskId, title, intent } = params;

  const askGptCount = intent.workflow?.askGptCount ?? 0;
  const askUserCount = intent.workflow?.askUserCount ?? 0;
  const allowMaterialRequest = intent.workflow?.allowMaterialRequest ?? false;
  const allowSearchRequest = intent.workflow?.allowSearchRequest ?? false;
  const finalizationPolicy =
    intent.workflow?.finalizationPolicy ?? "auto_when_ready";

  const workflowLines: string[] = [];
  if (askGptCount > 0) workflowLines.push(`- まずGPTに${askGptCount}回質問してよい`);
  if (askUserCount > 0) workflowLines.push(`- 必要ならユーザーに${askUserCount}回確認してよい`);
  if (allowMaterialRequest) workflowLines.push("- 必要なら追加資料を要求してよい");
  if (allowSearchRequest) workflowLines.push("- 必要ならGoogle検索を要求してよい");
  workflowLines.push("- 準備が整ったら最終成果物を返す");
  workflowLines.push("- 各依頼や確認には固有の ACTION_ID を付ける");

  return `<<SYS_TASK>>
#${taskId}
TITLE: ${title}
GOAL:
${intent.goal}

OUTPUT_TYPE: ${intent.output.type}
OUTPUT_LANGUAGE: ${intent.output.language ?? "ja"}
FINALIZATION_POLICY: ${finalizationPolicy}

RULES:
- 必要に応じてGPTに質問してよい
- 必要に応じてユーザーに質問してよい
- 必要に応じて追加資料を要求してよい
- 必要に応じてGoogle検索を要求してよい
- ユーザー回答や資料提供を待つ間も、他に進められる作業があれば続けること
- 必須条件が未充足なら FINAL を出さず、必要な追加アクションを返すこと
- ユーザーやGPTへの依頼には ACTION_ID を付けること
- 進捗報告は <<SYS_TASK_PROGRESS>> ... <<END_SYS_TASK_PROGRESS>> を使うこと
- ユーザーへの質問は <<SYS_USER_QUESTION>> を使うこと
- 資料要求は <<SYS_MATERIAL_REQUEST>> を使うこと
- GPTへの質問は <<SYS_ASK_GPT>> を使うこと
- 完了時は <<SYS_TASK_DONE>> を使うこと

WORKFLOW_HINT:
${workflowLines.join("\n")}

EVENT_FORMAT_EXAMPLES:
<<SYS_TASK_PROGRESS>>
TASK_ID: ${taskId}
STATUS: IN_PROGRESS
SUMMARY: 現在の進行状況を簡潔に書く
<<END_SYS_TASK_PROGRESS>>

<<SYS_USER_QUESTION>>
TASK_ID: ${taskId}
ACTION_ID: A001
REQUIRED: YES
BODY: ユーザーへの質問文
<<END_SYS_USER_QUESTION>>

<<SYS_MATERIAL_REQUEST>>
TASK_ID: ${taskId}
ACTION_ID: A002
REQUIRED: NO
BODY: ユーザーに依頼したい資料や情報
<<END_SYS_MATERIAL_REQUEST>>

<<SYS_ASK_GPT>>
TASK_ID: ${taskId}
ACTION_ID: A003
BODY: GPTへ依頼したい内容
<<END_SYS_ASK_GPT>>

<<SYS_TASK_DONE>>
TASK_ID: ${taskId}
STATUS: DONE
SUMMARY: 完了内容の要約
<<END_SYS_TASK_DONE>>
<<SYS_TASK_END>>`;
}

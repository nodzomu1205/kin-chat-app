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
- すべてのアクションは SYS_ACTION フォーマットで返すこと

WORKFLOW_HINT:
${workflowLines.join("\n")}
<<SYS_TASK_END>>`;
}
import type { MultipartAssembly } from "@/types/chat";

export type TaskCharConstraint =
  | { rule: "exact"; limit: number }
  | { rule: "at_least"; limit: number }
  | { rule: "up_to"; limit: number }
  | { rule: "around"; limit: number };

export type ExtractedTaskDonePart = {
  taskId?: string;
  status?: string;
  summary?: string;
  partIndex: number;
  totalParts: number;
  characters: number;
  content: string;
};

export function validateMultipartAssemblyText(
  text: string,
  constraint: TaskCharConstraint | null
) {
  const charCount = Array.from(text.trim()).length;

  if (!constraint) {
    return {
      accepted: true,
      charCount,
      summary: `Final deliverable received (${charCount} characters).`,
    };
  }

  let accepted = true;
  let ruleText = "";

  switch (constraint.rule) {
    case "exact":
      accepted =
        charCount >= Math.floor(constraint.limit * 0.9) &&
        charCount <= Math.ceil(constraint.limit * 1.1);
      ruleText = `around ${constraint.limit} characters`;
      break;
    case "at_least":
      accepted = charCount >= constraint.limit;
      ruleText = `at least ${constraint.limit} characters`;
      break;
    case "up_to":
      accepted = charCount <= constraint.limit;
      ruleText = `at most ${constraint.limit} characters`;
      break;
    case "around":
      accepted =
        charCount >= Math.floor(constraint.limit * 0.8) &&
        charCount <= Math.ceil(constraint.limit * 1.2);
      ruleText = `around ${constraint.limit} characters`;
      break;
  }

  return {
    accepted,
    charCount,
    summary: accepted
      ? `Final deliverable received (${charCount} characters), meeting the ${ruleText} requirement.`
      : `Final deliverable received (${charCount} characters), which does not satisfy the ${ruleText} requirement.`,
  };
}

export function buildMultipartRevisionRequiredBlock(params: {
  taskId?: string;
  currentTaskId?: string;
  charCount: number;
  summary: string;
}) {
  return [
    "<<SYS_TASK_CONFIRM>>",
    `TASK_ID: ${params.taskId || params.currentTaskId || ""}`,
    "STATUS: REVISION_REQUIRED",
    `SUMMARY: ${params.summary} Continue the task, use any remaining allowed actions if needed, and resend the revised final deliverable in <<SYS_TASK_DONE>> PART n/total format only.`,
    `CURRENT_CHARACTERS: ${params.charCount}`,
    "<<END_SYS_TASK_CONFIRM>>",
  ].join("\n");
}

export function extractTaskDoneParts(text: string): ExtractedTaskDonePart[] {
  const matches = [...text.matchAll(/<<SYS_TASK_DONE>>([\s\S]*?)<<END_SYS_TASK_DONE>>/g)];

  return matches
    .map((match) => {
      if (!match?.[1]) return null;

      const body = match[1].replace(/\r\n/g, "\n");
      const lines = body.split("\n");
      const getField = (name: string) =>
        lines.find((line) => line.startsWith(`${name}:`))?.slice(name.length + 1).trim() || "";
      const partText = getField("PART");
      const partMatch = partText.match(/(\d+)\s*\/\s*(\d+)/);
      if (!partMatch) return null;

      const partIndex = Number(partMatch[1]);
      const totalParts = Number(partMatch[2]);
      const characters = Number(getField("CHARACTERS") || 0);
      const contentStartIndex = lines.findIndex((line) => line.startsWith("CHARACTERS:"));
      const content = lines
        .slice(contentStartIndex >= 0 ? contentStartIndex + 1 : 0)
        .join("\n")
        .trim();

      return {
        taskId: getField("TASK_ID") || undefined,
        status: getField("STATUS") || undefined,
        summary: getField("SUMMARY") || undefined,
        partIndex,
        totalParts,
        characters,
        content,
      };
    })
    .filter(Boolean) as ExtractedTaskDonePart[];
}

export function buildMultipartAck(params: {
  taskId?: string;
  currentTaskId?: string;
  partIndex: number;
  totalParts: number;
  isFinal: boolean;
}) {
  return [
    "<<SYS_GPT_RESPONSE>>",
    `TASK_ID: ${params.taskId || params.currentTaskId || ""}`,
    `BODY: ${
      params.isFinal
        ? `PART ${params.partIndex}/${params.totalParts} received. All parts received successfully.`
        : `PART ${params.partIndex}/${params.totalParts} received. Send PART ${params.partIndex + 1}/${params.totalParts}.`
    }`,
    "<<END_SYS_GPT_RESPONSE>>",
  ].join("\n");
}

export function applyMultipartPart(
  assemblies: MultipartAssembly[],
  part: {
    taskId?: string;
    status?: string;
    summary?: string;
    taskTitle?: string;
    kinName?: string;
    completedAt?: string;
    partIndex: number;
    totalParts: number;
    content: string;
  }
): { assemblies: MultipartAssembly[]; assembly: MultipartAssembly } {
  const id = `${part.taskId || "no-task"}-${part.status || "DONE"}`;
  const existing =
    assemblies.find((item) => item.id === id) || {
      id,
      taskId: part.taskId,
      artifactType: "task_result",
      taskTitle: part.taskTitle,
      kinName: part.kinName,
      completedAt: part.completedAt,
      status: part.status,
      summary: part.summary,
      totalParts: part.totalParts,
      parts: [],
      assembledText: "",
      isComplete: false,
      updatedAt: new Date().toISOString(),
      filename: `task-${part.taskId || "unknown"}-${(part.status || "done").toLowerCase()}.txt`,
    };

  const dedupedParts = existing.parts.filter((item) => item.index !== part.partIndex);
  const parts = [...dedupedParts, { index: part.partIndex, text: part.content }].sort(
    (a, b) => a.index - b.index
  );
  const isComplete = parts.length >= part.totalParts;
  const assembledText = parts.map((item) => item.text.trim()).join("\n\n").trim();

  const assembly: MultipartAssembly = {
    ...existing,
    taskId: part.taskId || existing.taskId,
    taskTitle: part.taskTitle || existing.taskTitle,
    kinName: part.kinName || existing.kinName,
    status: part.status || existing.status,
    summary: part.summary || existing.summary,
    totalParts: part.totalParts,
    parts,
    assembledText,
    isComplete,
    updatedAt: new Date().toISOString(),
    completedAt:
      isComplete ? part.completedAt || new Date().toISOString() : existing.completedAt,
  };

  return {
    assembly,
    assemblies: [assembly, ...assemblies.filter((item) => item.id !== id)].slice(0, 30),
  };
}

export function processMultipartTaskDoneText(params: {
  text: string;
  assemblies: MultipartAssembly[];
  currentTaskId?: string;
  currentTaskTitle?: string;
  kinName?: string;
  constraint: TaskCharConstraint | null;
}) {
  const parts = extractTaskDoneParts(params.text);
  if (parts.length === 0) return null;

  let workingAssemblies = params.assemblies;
  let assembliesChanged = false;
  let latestAck = "";
  let latestAccepted = false;
  let latestMessage = "";
  let latestValidationSummary = "";

  for (const multipart of parts) {
    const enriched = applyMultipartPart(workingAssemblies, {
      ...multipart,
      taskTitle:
        multipart.taskId && multipart.taskId === params.currentTaskId
          ? params.currentTaskTitle
          : undefined,
      kinName:
        multipart.taskId && multipart.taskId === params.currentTaskId
          ? params.kinName
          : undefined,
      completedAt: multipart.partIndex >= multipart.totalParts
        ? new Date().toISOString()
        : undefined,
    });
    workingAssemblies = enriched.assemblies;
    assembliesChanged = true;
    const assembly = enriched.assembly;
    const isFinalPart = multipart.partIndex >= multipart.totalParts;

    if (!assembly.isComplete || !isFinalPart) {
      latestAck = buildMultipartAck({
        taskId: multipart.taskId,
        currentTaskId: params.currentTaskId,
        partIndex: multipart.partIndex,
        totalParts: multipart.totalParts,
        isFinal: false,
      });
      latestAccepted = false;
      latestValidationSummary = "";
      latestMessage = `PART ${multipart.partIndex}/${multipart.totalParts} received. The next part request was prepared for Kin.`;
      continue;
    }

    const validation = validateMultipartAssemblyText(assembly.assembledText, params.constraint);
    latestAck = validation.accepted
      ? buildMultipartAck({
          taskId: multipart.taskId,
          currentTaskId: params.currentTaskId,
          partIndex: multipart.partIndex,
          totalParts: multipart.totalParts,
          isFinal: true,
        })
      : buildMultipartRevisionRequiredBlock({
          taskId: multipart.taskId,
          currentTaskId: params.currentTaskId,
          charCount: validation.charCount,
          summary: validation.summary,
        });
    latestAccepted = validation.accepted;
    latestValidationSummary = validation.summary;
    latestMessage = validation.accepted
      ? `Kin final deliverable was reassembled successfully as ${assembly.filename}.`
      : `${validation.summary} A revision request was prepared for Kin.`;
  }

  return {
    handled: true,
    accepted: latestAccepted,
    assemblies: workingAssemblies,
    assembliesChanged,
    ack: latestAck,
    message: latestMessage,
    validationSummary: latestValidationSummary,
  };
}

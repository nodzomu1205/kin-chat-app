import { normalizeUsage } from "@/lib/shared/tokenStats";

type TaskTitlePromptArgs = {
  currentTitle?: string;
  taskBody?: string;
  additionalSource?: string;
  userInstruction?: string;
  includeCurrentTitle?: boolean;
};

type TaskTitlePayload = {
  title: string;
};

export type TaskTitleDebug = {
  prompt: string;
  rawReply: string;
  parsed: unknown;
  adoptedTitle: string;
  additionalSource?: string;
  userInstruction?: string;
};

function trimSection(value?: string) {
  return value?.trim() || "";
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {}

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(trimmed.slice(start, end + 1));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {}
  }

  return null;
}

export function extractTaskSummaryBlock(taskBody?: string) {
  const body = trimSection(taskBody);
  if (!body) return "";

  const marker = "【タスク整理結果】";
  const markerIndex = body.indexOf(marker);
  if (markerIndex < 0) return "";

  const afterMarker = body.slice(markerIndex).trim();
  const blocks = afterMarker.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return blocks[0] || "";
}

export function mergeTaskTitleInstructions(...values: Array<string | undefined>) {
  const seen = new Set<string>();
  return values
    .map((value) => trimSection(value))
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .join("\n\n");
}

export function resolveTaskDraftUserInstruction(...values: Array<string | undefined>) {
  return mergeTaskTitleInstructions(...values);
}

export function buildTaskTitlePrompt(args: TaskTitlePromptArgs) {
  const sections = [
    args.includeCurrentTitle !== false && trimSection(args.currentTitle)
      ? `CURRENT_TITLE:\n${trimSection(args.currentTitle)}`
      : "",
    extractTaskSummaryBlock(args.taskBody)
      ? `TASK_SUMMARY_BLOCK:\n${extractTaskSummaryBlock(args.taskBody)}`
      : "",
    trimSection(args.additionalSource)
      ? `ADDITIONAL_SOURCE:\n${trimSection(args.additionalSource)}`
      : "",
    trimSection(args.userInstruction)
      ? `USER_INSTRUCTION:\n${trimSection(args.userInstruction)}`
      : "",
  ].filter(Boolean);

  return [
    "Return JSON only.",
    "",
    "Schema:",
    "{",
    '  "title": string',
    "}",
    "",
    ...sections,
  ].join("\n");
}

export function extractTaskTitlePayload(replyText: string): TaskTitlePayload | null {
  const parsed = parseJsonObject(replyText);
  if (!parsed) return null;

  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  if (!title) return null;
  return { title };
}

export async function requestTaskTitle(args: TaskTitlePromptArgs): Promise<{
  title: string | null;
  usage: Parameters<typeof normalizeUsage>[0] | null;
  debug: Omit<TaskTitleDebug, "adoptedTitle">;
}> {
  const prompt = buildTaskTitlePrompt(args);
  if (!prompt.trim()) {
    return {
      title: null,
      usage: null,
      debug: {
        prompt,
        rawReply: "",
        parsed: null,
        additionalSource: trimSection(args.additionalSource),
        userInstruction: trimSection(args.userInstruction),
      },
    };
  }

  try {
    const res = await fetch("/api/chatgpt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "memory_interpret",
        input: prompt,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        title: null,
        usage: null,
        debug: {
          prompt,
          rawReply: typeof data?.reply === "string" ? data.reply : "",
          parsed: null,
          additionalSource: trimSection(args.additionalSource),
          userInstruction: trimSection(args.userInstruction),
        },
      };
    }

    const reply = typeof data?.reply === "string" ? data.reply : "";
    const payload = extractTaskTitlePayload(reply);
    return {
      title: payload?.title || null,
      usage: data?.usage ?? null,
      debug: {
        prompt,
        rawReply: reply,
        parsed: payload,
        additionalSource: trimSection(args.additionalSource),
        userInstruction: trimSection(args.userInstruction),
      },
    };
  } catch {
    return {
      title: null,
      usage: null,
      debug: {
        prompt,
        rawReply: "",
        parsed: null,
        additionalSource: trimSection(args.additionalSource),
        userInstruction: trimSection(args.userInstruction),
      },
    };
  }
}

export async function resolveGeneratedTaskTitle(args: TaskTitlePromptArgs & {
  explicitTitle?: string;
  fallbackTitle?: string;
}): Promise<{
  title: string;
  usage: Parameters<typeof normalizeUsage>[0] | null;
  debug: TaskTitleDebug;
}> {
  const explicitTitle = trimSection(args.explicitTitle);
  if (explicitTitle) {
    return {
      title: explicitTitle,
      usage: null,
      debug: {
        prompt: "",
        rawReply: "",
        parsed: { title: explicitTitle, source: "explicitTitle" },
        adoptedTitle: explicitTitle,
        additionalSource: trimSection(args.additionalSource),
        userInstruction: trimSection(args.userInstruction),
      },
    };
  }

  const generated = await requestTaskTitle({
    currentTitle: args.currentTitle,
    taskBody: args.taskBody,
    additionalSource: args.additionalSource,
    userInstruction: args.userInstruction,
    includeCurrentTitle: args.includeCurrentTitle,
  });

  return {
    title: generated.title || trimSection(args.fallbackTitle),
    usage: generated.usage,
    debug: {
      ...generated.debug,
      adoptedTitle: generated.title || trimSection(args.fallbackTitle),
    },
  };
}

import type {
  TransformIntent,
  UsageSummary,
} from "@/lib/app/task-runtime/transformIntentTypes";
import type { ReasoningMode } from "@/lib/app/task-runtime/reasoningMode";

export function shouldTransformContent(intent: TransformIntent): boolean {
  return Boolean(
    intent.translateTo ||
      intent.summarize ||
      intent.bulletize ||
      intent.preserveAllText ||
      intent.exact ||
      intent.focusQuery ||
      intent.extractOnly ||
      intent.includeTopics.length > 0 ||
      intent.excludeTopics.length > 0 ||
      intent.tone ||
      intent.formality ||
      intent.dialect ||
      intent.persona ||
      intent.audience ||
      intent.outputFormat ||
      intent.maxLength ||
      intent.minLength ||
      intent.structureHint ||
      intent.keepQuotes
  );
}

function indentForSafePrompt(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join("\n");
}

function buildTransformPrompt(text: string, intent: TransformIntent): string {
  const instructions: string[] = [];

  if (intent.translateTo) {
    instructions.push(`Rewrite the source text in ${intent.translateTo}. The output itself must be in ${intent.translateTo}.`);
  }

  if (intent.summarize) {
    instructions.push("Summarize the source text while keeping the key facts and the user's stated requirements.");
  }

  if (intent.bulletize) {
    instructions.push("Use clean bullet points when appropriate.");
  }

  if (intent.outputFormat === "numbered_list") {
    instructions.push("Return the result as a numbered list.");
  }

  if (intent.outputFormat === "table") {
    instructions.push("Return the result as a concise table if feasible.");
  }

  if (intent.outputFormat === "json") {
    instructions.push("Return valid JSON only.");
  }

  if (intent.outputFormat === "markdown") {
    instructions.push("Use markdown formatting where appropriate.");
  }

  if (intent.preserveAllText) {
    instructions.push("Keep all material details that appear important in the original text.");
  }

  if (intent.exact) {
    instructions.push("Do not paraphrase away concrete facts, proper nouns, or explicit relationships.");
  }

  if (intent.focusQuery) {
    instructions.push(`Extract only the parts that are directly relevant to: ${intent.focusQuery}.`);
  }

  if (intent.extractOnly) {
    instructions.push("Do not include unrelated sections or surrounding material.");
  }

  if (intent.includeTopics.length > 0) {
    instructions.push(`The output must include these topics if present: ${intent.includeTopics.join(", ")}.`);
  }

  if (intent.excludeTopics.length > 0) {
    instructions.push(`Exclude these topics unless absolutely necessary: ${intent.excludeTopics.join(", ")}.`);
  }

  if (intent.tone) {
    instructions.push(`Use this tone: ${intent.tone}.`);
  }

  if (intent.formality) {
    instructions.push(`Use this formality level: ${intent.formality}.`);
  }

  if (intent.dialect) {
    instructions.push(`Use this dialect or speech style if natural: ${intent.dialect}.`);
  }

  if (intent.persona) {
    instructions.push(`Write with this persona: ${intent.persona}.`);
  }

  if (intent.audience) {
    instructions.push(`Target this audience: ${intent.audience}.`);
  }

  if (intent.maxLength) {
    instructions.push(`Keep within this maximum length target: ${intent.maxLength}.`);
  }

  if (intent.minLength) {
    instructions.push(`Try to satisfy this minimum length target: ${intent.minLength}.`);
  }

  if (intent.structureHint) {
    instructions.push(intent.structureHint);
  }

  if (intent.keepQuotes) {
    instructions.push("Preserve meaningful original quotations when possible.");
  }

  instructions.push("Return only the transformed text.");
  instructions.push("Do not add commentary, headers, explanations, or quotes around the result.");
  instructions.push("If multiple instructions apply, satisfy all of them in one final output.");

  return [
    "You are a text transformation engine.",
    "Your only job is to rewrite SOURCE_TEXT according to the instructions.",
    "",
    "INSTRUCTIONS:",
    ...instructions.map((line) => `- ${line}`),
    "",
    "SOURCE_TEXT_START",
    indentForSafePrompt(text),
    "SOURCE_TEXT_END",
  ].join("\n");
}

export async function transformTextWithIntent(args: {
  text: string;
  intent: TransformIntent;
  reasoningMode?: ReasoningMode;
}): Promise<{ text: string; usage: UsageSummary | null }> {
  if (!shouldTransformContent(args.intent)) {
    return {
      text: args.text,
      usage: null,
    };
  }

  const res = await fetch("/api/chatgpt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "chat",
      memory: null,
      recentMessages: [],
      input: buildTransformPrompt(args.text, args.intent),
      instructionMode: "normal",
      reasoningMode: args.reasoningMode === "strict" ? "strict" : "creative",
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "transform request failed"
    );
  }

  const reply =
    typeof data?.reply === "string" && data.reply.trim()
      ? data.reply.trim()
      : args.text;

  return {
    text: reply,
    usage: data?.usage ?? null,
  };
}

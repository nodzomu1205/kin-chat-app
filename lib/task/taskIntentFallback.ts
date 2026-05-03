import type { TaskIntent } from "@/types/taskProtocol";

export type TaskIntentFallbackRule = "exact" | "at_least" | "up_to" | "around";

export type TaskIntentFallbackSlotKind =
  | "output_limit"
  | "gpt_request"
  | "search_request"
  | "youtube_transcript_request"
  | "library_reference"
  | "image_library_reference"
  | "ppt_slide_count"
  | "ppt_design_request"
  | "ask_user";

export type TaskIntentFallbackCandidate = {
  kind: TaskIntentFallbackSlotKind;
  phrase: string;
  count?: number;
  charLimit?: number;
  rule?: TaskIntentFallbackRule;
};

export type TaskIntentFallbackPayload = {
  candidates: TaskIntentFallbackCandidate[];
};

type SlotValue = {
  matched: boolean;
  phrase: string;
  count?: number | null;
  charLimit?: number | null;
  rule?: TaskIntentFallbackRule | null;
};

const SLOT_KINDS: TaskIntentFallbackSlotKind[] = [
  "output_limit",
  "gpt_request",
  "search_request",
  "youtube_transcript_request",
  "library_reference",
  "image_library_reference",
  "ppt_slide_count",
  "ppt_design_request",
  "ask_user",
];

function tryParseJsonObject(text: string): Record<string, unknown> | null {
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

function normalizeRule(value: unknown): TaskIntentFallbackRule | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toLowerCase();
  if (
    trimmed === "exact" ||
    trimmed === "at_least" ||
    trimmed === "up_to" ||
    trimmed === "around"
  ) {
    return trimmed;
  }
  return undefined;
}

function normalizeSlotValue(raw: unknown): SlotValue | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const matched = item.matched === true;
  const phrase = typeof item.phrase === "string" ? item.phrase.trim() : "";
  const count =
    typeof item.count === "number" && item.count > 0 ? Math.floor(item.count) : null;
  const charLimit =
    typeof item.charLimit === "number" && item.charLimit > 0
      ? Math.floor(item.charLimit)
      : null;
  const rule = normalizeRule(item.rule) ?? null;

  return {
    matched,
    phrase,
    count,
    charLimit,
    rule,
  };
}

function buildSlotSchemaLines(kind: TaskIntentFallbackSlotKind) {
  if (kind === "output_limit") {
    return [
      `  "${kind}": {`,
      '    "matched": boolean,',
      '    "phrase": string,',
      '    "charLimit": number | null,',
      '    "rule": "up_to" | "around" | "at_least" | "exact" | null',
      "  }",
    ];
  }

  return [
    `  "${kind}": {`,
    '    "matched": boolean,',
    '    "phrase": string,',
    '    "count": number | null,',
    '    "rule": "up_to" | "around" | "exact" | "at_least" | null',
    "  }",
  ];
}

export function buildTaskIntentFallbackPrompt(input: string, _baseline: TaskIntent) {
  void _baseline;
  const schemaLines = SLOT_KINDS.flatMap((kind, index) => {
    const lines = buildSlotSchemaLines(kind);
    if (index < SLOT_KINDS.length - 1) {
      lines[lines.length - 1] = `${lines[lines.length - 1]},`;
    }
    return lines;
  });

  return [
    "Read USER_TEXT and return JSON only.",
    "",
    "Return this exact JSON shape:",
    "{",
    ...schemaLines,
    "}",
    "",
    "Rules:",
    "- Always return every slot above.",
    "- Set matched=true only when USER_TEXT explicitly contains that requirement.",
    "- Write phrase as a snippet around the number including the subject, but not necessarily the whole sentence.",
    "- Infer rule from the semantic meaning of the user wording: upper bound => up_to, approximate target => around, lower bound => at_least, fixed number => exact.",
    "- Do not default approximate wording to up_to. Do not default upper-bound wording to at_least.",
    "- Use library_reference for normal text/library data reference requirements.",
    "- Use image_library_reference only for image-library reference requirements.",
    "- Use ppt_slide_count for requested number of presentation slides. Use ppt_design_request for count/limit of PPT design work requests.",
    "- Treat every slot independently. One matched slot must not suppress another matched slot.",
    "- If USER_TEXT requests both normal library reference and image-library reference, set both library_reference and image_library_reference matched=true.",
    "- If USER_TEXT requests both a number of slides and a limit/count for PPT design work requests, set both ppt_slide_count and ppt_design_request matched=true.",
    "",
    "USER_TEXT_START",
    input,
    "USER_TEXT_END",
  ].join("\n");
}

export function extractTaskIntentFallbackPayload(
  replyText: string
): TaskIntentFallbackPayload | null {
  const parsed = tryParseJsonObject(replyText);
  if (!parsed) return null;

  const candidates: TaskIntentFallbackCandidate[] = SLOT_KINDS.flatMap((kind) => {
    const slot = normalizeSlotValue(parsed[kind]);
    if (!slot?.matched || !slot.phrase) return [];

    return [
      {
        kind,
        phrase: slot.phrase,
        count: slot.count ?? undefined,
        charLimit: slot.charLimit ?? undefined,
        rule: slot.rule ?? undefined,
      },
    ];
  });

  return { candidates };
}

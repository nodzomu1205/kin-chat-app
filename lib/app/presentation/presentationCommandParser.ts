export type PptCommandIntent =
  | "createDraft"
  | "reviseDraft"
  | "renderPptx"
  | "showPreview";

export type ParsedPptCommand = {
  isPptCommand: boolean;
  body: string;
  documentId?: string;
  density?: "concise" | "standard" | "detailed" | "dense";
  generateImages?: boolean;
  intent?: PptCommandIntent;
};

const PPT_PREFIX_PATTERN = /^\s*\/ppt(?:\s|$)/i;
const DOCUMENT_ID_PATTERN = /^\s*Document ID\s*:\s*([A-Za-z0-9_.:-]+)/im;
const DENSITY_PATTERN = /^\s*Density\s*:\s*(concise|standard|detailed|dense)\s*$/gim;
const GENERATE_IMAGES_PATTERN = /^\s*(?:Generate Images|Images)\s*:\s*(true|false|yes|no|on|off)\s*$/gim;

function stripPptPrefix(text: string) {
  return text.replace(PPT_PREFIX_PATTERN, "").replace(/^\s*\r?\n?/, "").trim();
}

function stripDocumentIdLine(text: string) {
  return text.replace(DOCUMENT_ID_PATTERN, "").trim();
}

function stripDensityLines(text: string) {
  return text.replace(DENSITY_PATTERN, "").trim();
}

function stripGenerateImagesLines(text: string) {
  return text.replace(GENERATE_IMAGES_PATTERN, "").trim();
}

function parseDensity(text: string): ParsedPptCommand["density"] {
  DENSITY_PATTERN.lastIndex = 0;
  const match = DENSITY_PATTERN.exec(text);
  const raw = match?.[1]?.toLowerCase();
  return raw === "concise" ||
    raw === "standard" ||
    raw === "detailed" ||
    raw === "dense"
    ? raw
    : undefined;
}

function parseGenerateImages(text: string) {
  GENERATE_IMAGES_PATTERN.lastIndex = 0;
  const match = GENERATE_IMAGES_PATTERN.exec(text);
  const raw = match?.[1]?.toLowerCase();
  if (!raw) return undefined;
  return raw === "true" || raw === "yes" || raw === "on";
}

function isRenderRequest(body: string) {
  return (
    /\b(create|render|generate|export)\s+(ppt|pptx|power\s*point|powerpoint)\b/i.test(
      body
    ) ||
    /\b(ppt|pptx|power\s*point|powerpoint)\s+(create|render|generate|export)\b/i.test(
      body
    ) ||
    /(?:パワポ|powerpoint|pptx?).*(?:作成|生成|出力|書き出し)/i.test(body)
  );
}

function isPreviewRequest(body: string) {
  const normalized = body.trim();
  return (
    /^(show|view|preview)(\s+(draft|presentation|slides?))?$/i.test(normalized) ||
    /^(確認|プレビュー|preview|show preview|view preview)$/i.test(normalized)
  );
}

export function parsePptCommand(text: string): ParsedPptCommand {
  if (!PPT_PREFIX_PATTERN.test(text)) {
    return {
      isPptCommand: false,
      body: text,
    };
  }

  const body = stripPptPrefix(text);
  const documentId = body.match(DOCUMENT_ID_PATTERN)?.[1]?.trim();
  const density = parseDensity(body);
  const generateImages = parseGenerateImages(body);
  const bodyWithoutDocumentId = stripGenerateImagesLines(
    stripDensityLines(stripDocumentIdLine(body))
  );
  const intent: PptCommandIntent = isRenderRequest(bodyWithoutDocumentId)
    ? "renderPptx"
    : !documentId
      ? "createDraft"
      : isPreviewRequest(bodyWithoutDocumentId)
        ? "showPreview"
        : "reviseDraft";

  return {
    isPptCommand: true,
    body: bodyWithoutDocumentId,
    documentId,
    density,
    generateImages,
    intent,
  };
}

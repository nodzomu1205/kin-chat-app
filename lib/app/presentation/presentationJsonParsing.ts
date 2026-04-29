import type {
  PresentationPatch,
  PresentationPatchOperation,
  PresentationDensity,
  PresentationMotherSpec,
  PresentationSpec,
  SlideSpec,
} from "@/lib/app/presentation/presentationTypes";
import {
  adaptMotherSpecToPresentationSpec,
  parsePresentationMotherSpec,
} from "@/lib/app/presentation/presentationMotherSpec";

export type ParsedPresentationDraft = {
  motherSpec?: PresentationMotherSpec;
  spec: PresentationSpec;
};

export function parsePresentationSpecFromText(text: string): PresentationSpec {
  return parsePresentationDraftFromText(text).spec;
}

export function parsePresentationDraftFromText(
  text: string,
  options: { renderDensity?: PresentationDensity } = {}
): ParsedPresentationDraft {
  const parsed = parseJsonObject(text);
  if (looksLikeMotherSpecResponse(parsed)) {
    const motherSpec = parsePresentationMotherSpec(parsed);
    return {
      motherSpec,
      spec: adaptMotherSpecToPresentationSpec(motherSpec, {
        renderDensity: options.renderDensity,
      }),
    };
  }

  const spec = normalizePresentationSpecCandidate(parsed);
  if (!isPresentationSpec(spec)) {
    throw new Error("GPT did not return a valid PresentationSpec v0.1 JSON object.");
  }
  return { spec };
}

export function parsePresentationPatchFromText(text: string): PresentationPatch {
  const parsed = parseJsonObject(text);
  const patch = normalizePresentationPatchCandidate(parsed);
  if (!isPresentationPatch(patch)) {
    throw new Error("GPT did not return a valid PresentationPatch v0.1 JSON object.");
  }
  return patch;
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const candidates = buildJsonCandidates(trimmed);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next candidate.
    }
  }
  throw new Error("No valid JSON object found in GPT response.");
}

function buildJsonCandidates(text: string): string[] {
  const candidates = [text];
  const fencedMatches = Array.from(
    text.matchAll(/```(?:json)?\s*([\s\S]*?)```/giu)
  );
  candidates.push(...fencedMatches.map((match) => match[1].trim()));

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(text.slice(firstBrace, lastBrace + 1));
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function normalizePresentationSpecCandidate(value: unknown): unknown {
  const candidate = value as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") return value;

  const wrapped =
    candidate.spec ||
    candidate.presentationSpec ||
    candidate.presentation ||
    candidate.deck ||
    candidate.data;
  return coercePresentationSpec(wrapped || value);
}

function looksLikeMotherSpecResponse(value: unknown): boolean {
  const candidate = value as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") return false;
  if (candidate.version === "0.2-mother") return true;
  return !!(
    candidate.motherSpec ||
    candidate.presentationMotherSpec ||
    candidate.mother ||
    candidate.contentModel
  );
}

function normalizePresentationPatchCandidate(value: unknown): unknown {
  if (Array.isArray(value)) {
    return coercePresentationPatch({ operations: value });
  }

  const candidate = value as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") return value;
  if (isPresentationPatch(candidate)) return candidate;
  if (
    Array.isArray(candidate.operations) ||
    Array.isArray(candidate.ops) ||
    candidate.op ||
    candidate.type ||
    candidate.action
  ) {
    return coercePresentationPatch(candidate);
  }

  const wrapped =
    candidate.patch ||
    candidate.presentationPatch ||
    candidate.revision ||
    candidate.presentationRevision ||
    candidate.changes ||
    candidate.data;
  return coercePresentationPatch(wrapped || value);
}

function isPresentationSpec(value: unknown): value is PresentationSpec {
  const candidate = value as PresentationSpec;
  return (
    !!candidate &&
    candidate.version === "0.1" &&
    typeof candidate.title === "string" &&
    candidate.title.trim().length > 0 &&
    Array.isArray(candidate.slides) &&
    candidate.slides.length > 0 &&
    candidate.slides.every(isSlideSpec)
  );
}

function coercePresentationSpec(value: unknown): unknown {
  const candidate = value as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") return value;

  const rawSlides =
    Array.isArray(candidate.slides)
      ? candidate.slides
      : Array.isArray(candidate.pages)
        ? candidate.pages
        : Array.isArray(candidate.deck)
          ? candidate.deck
          : [];

  const slides = rawSlides.map((slide, index) => coerceSlide(slide, index));
  const title =
    stringValue(candidate.title) ||
    stringValue(candidate.presentationTitle) ||
    stringValue(candidate.deckTitle) ||
    stringValue(candidate.name) ||
    stringValue((slides[0] as { title?: unknown } | undefined)?.title) ||
    "Presentation";

  return {
    ...candidate,
    version: candidate.version === "0.1" ? "0.1" : "0.1",
    title,
    subtitle: stringValue(candidate.subtitle) || undefined,
    audience: stringValue(candidate.audience) || undefined,
    purpose: stringValue(candidate.purpose) || undefined,
    theme: isSupportedTheme(candidate.theme) ? candidate.theme : "business-clean",
    density: isSupportedDensity(candidate.density) ? candidate.density : "standard",
    slides,
  };
}

function coercePresentationPatch(value: unknown): unknown {
  if (Array.isArray(value)) {
    return {
      version: "0.1",
      operations: value.map(coercePatchOperation).filter(Boolean),
    };
  }

  const candidate = value as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") return value;

  if (isPresentationPatch(candidate)) return candidate;

  const rawOperations =
    Array.isArray(candidate.operations)
      ? candidate.operations
      : Array.isArray(candidate.ops)
        ? candidate.ops
        : Array.isArray(candidate.patches)
          ? candidate.patches
          : Array.isArray(candidate.changes)
            ? candidate.changes
            : undefined;

  const operations = rawOperations
    ? rawOperations.map(coercePatchOperation).filter(Boolean)
    : [coercePatchOperation(candidate)].filter(Boolean);

  return {
    ...candidate,
    version: "0.1",
    operations,
  };
}

function coercePatchOperation(value: unknown): PresentationPatchOperation | null {
  const candidate = value as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") return null;

  const rawOp = stringValue(candidate.op || candidate.type || candidate.action)
    .replace(/[-_\s]+/g, "")
    .toLowerCase();
  const slideNumber =
    numberValue(candidate.slideNumber) ||
    numberValue(candidate.slide) ||
    numberValue(candidate.pageNumber) ||
    slideIndexToNumber(candidate.slideIndex);

  if (rawOp === "updatedeck" || rawOp === "deck" || rawOp === "metadata") {
    return {
      op: "updateDeck",
      title: stringValue(candidate.title) || undefined,
      subtitle: stringValue(candidate.subtitle) || undefined,
      audience: stringValue(candidate.audience) || undefined,
      purpose: stringValue(candidate.purpose) || undefined,
      theme: isSupportedTheme(candidate.theme) ? candidate.theme : undefined,
    };
  }

  if (
    rawOp === "updateslide" ||
    rawOp === "editslide" ||
    rawOp === "modifyslide" ||
    rawOp === "changeSlide".toLowerCase()
  ) {
    const patch =
      candidate.patch ||
      candidate.changes ||
      candidate.fields ||
      candidate.update;
    return slideNumber && patch && typeof patch === "object"
      ? { op: "updateSlide", slideNumber, patch: patch as Record<string, unknown> }
      : null;
  }

  if (rawOp === "replaceslide" || rawOp === "rewriteSlide".toLowerCase()) {
    const slide = coerceSlide(candidate.slide || candidate.replacement || candidate.nextSlide, slideNumber ? slideNumber - 1 : 0);
    return slideNumber && isSlideSpec(slide)
      ? { op: "replaceSlide", slideNumber, slide }
      : null;
  }

  if (rawOp === "insertslide" || rawOp === "addslide") {
    const afterSlideNumber =
      numberValue(candidate.afterSlideNumber) ||
      numberValue(candidate.afterSlide) ||
      numberValue(candidate.afterPageNumber) ||
      0;
    const slide = coerceSlide(candidate.slide || candidate.newSlide, afterSlideNumber);
    return isSlideSpec(slide)
      ? { op: "insertSlide", afterSlideNumber, slide }
      : null;
  }

  if (rawOp === "deleteslide" || rawOp === "removeslide") {
    return slideNumber ? { op: "deleteSlide", slideNumber } : null;
  }

  if (rawOp === "moveslide" || rawOp === "reorderslide") {
    const fromSlideNumber =
      numberValue(candidate.fromSlideNumber) ||
      numberValue(candidate.from) ||
      slideIndexToNumber(candidate.fromSlideIndex);
    const toSlideNumber =
      numberValue(candidate.toSlideNumber) ||
      numberValue(candidate.to) ||
      slideIndexToNumber(candidate.toSlideIndex);
    return fromSlideNumber && toSlideNumber
      ? { op: "moveSlide", fromSlideNumber, toSlideNumber }
      : null;
  }

  const patch = candidate.patch || candidate.changes || candidate.fields || candidate.update;
  if (slideNumber && patch && typeof patch === "object") {
    return { op: "updateSlide", slideNumber, patch: patch as Record<string, unknown> };
  }

  return null;
}

function coerceSlide(value: unknown, index: number): unknown {
  const candidate = value as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") {
    return {
      type: "bullets",
      title: `Slide ${index + 1}`,
      bullets: [{ text: String(value || "") || "Content" }],
    };
  }

  const rawType = stringValue(candidate.type || candidate.layout || candidate.kind)
    .replace(/[-_\s]+/g, "")
    .toLowerCase();
  const contentObject = objectValue(candidate.content);
  const title =
    stringValue(candidate.title) ||
    stringValue(contentObject?.title) ||
    stringValue(candidate.heading) ||
    stringValue(candidate.name) ||
    `Slide ${index + 1}`;

  if (rawType === "title" || !rawType && index === 0 && !hasContentLikeFields(candidate)) {
    return {
      ...candidate,
      type: "title",
      title,
      subtitle:
        stringValue(candidate.subtitle || contentObject?.subtitle || candidate.lead) ||
        undefined,
    };
  }

  if (rawType === "section" || rawType === "divider" || rawType === "chapter") {
    return {
      ...candidate,
      type: "section",
      title,
      subtitle:
        stringValue(
          candidate.subtitle ||
            contentObject?.subtitle ||
            contentObject?.text ||
            candidate.lead ||
            candidate.content ||
            candidate.body
        ) ||
        undefined,
      sectionNumber: stringValue(candidate.sectionNumber) || undefined,
    };
  }

  if (
    rawType === "twocolumn" ||
    rawType === "comparison" ||
    rawType === "beforeafter" ||
    (rawType !== "table" &&
      !Array.isArray(candidate.rows) &&
      Array.isArray(candidate.columns) &&
      candidate.columns.length === 2)
  ) {
    const columns = Array.isArray(candidate.columns) ? candidate.columns : [];
    return {
      ...candidate,
      type: "twoColumn",
      title,
      lead: stringValue(candidate.lead || contentObject?.lead || candidate.summary) || undefined,
      left: coerceColumn(
        preferredColumnSource(
          candidate.left,
          candidate.leftContent || buildColumnFromContentObject(contentObject, "left"),
          columns[0]
        ),
        "Left"
      ),
      right: coerceColumn(
        preferredColumnSource(
          candidate.right,
          candidate.rightContent || buildColumnFromContentObject(contentObject, "right"),
          columns[1]
        ),
        "Right"
      ),
      takeaway:
        stringValue(candidate.takeaway || contentObject?.takeaway || candidate.conclusion) ||
        undefined,
    };
  }

  if (rawType === "table" || Array.isArray(candidate.rows)) {
    const columns = coerceStringArray(candidate.columns).slice(0, 5);
    const rows = Array.isArray(candidate.rows)
      ? candidate.rows
          .map((row) => coerceStringArray(row).slice(0, columns.length || 5))
          .filter((row) => row.length > 0)
      : [];
    const safeColumns =
      columns.length >= 2
        ? columns
        : rows[0]?.length >= 2
          ? rows[0].map((_, rowIndex) => `Column ${rowIndex + 1}`)
          : ["Item", "Detail"];
    const safeRows = rows
      .map((row) => normalizeRowLength(row, safeColumns.length))
      .filter((row) => row.length === safeColumns.length);

    return {
      ...candidate,
      type: "table",
      title,
      lead: stringValue(candidate.lead || contentObject?.lead || candidate.summary) || undefined,
      columns: safeColumns,
      rows: safeRows.length > 0 ? safeRows : [["Item", "Detail"]],
      takeaway: stringValue(candidate.takeaway || candidate.conclusion) || undefined,
    };
  }

  if (rawType === "closing" || rawType === "conclusion" || rawType === "nextsteps") {
    return {
      ...candidate,
      type: "closing",
      title,
      message:
        stringValue(
          candidate.message ||
            contentObject?.message ||
            contentObject?.text ||
            candidate.summary ||
            candidate.body ||
            candidate.content
        ) ||
        undefined,
      nextSteps: coerceStringArray(
        candidate.nextSteps ||
          contentObject?.nextSteps ||
          contentObject?.actions ||
          candidate.actions ||
          candidate.bullets
      ),
      contact: stringValue(candidate.contact) || undefined,
    };
  }

  return {
    ...candidate,
    type: "bullets",
    title,
    lead:
      stringValue(candidate.lead || contentObject?.lead || candidate.summary || candidate.body) ||
      undefined,
    bullets: coerceBulletItems(
      candidate.bullets ||
        contentObject?.bullets ||
        contentObject?.items ||
        contentObject?.points ||
        candidate.items ||
        candidate.points ||
        candidate.content
    ),
    takeaway:
      stringValue(candidate.takeaway || contentObject?.takeaway || candidate.conclusion) ||
      undefined,
  };
}

function coerceColumn(value: unknown, fallbackHeading: string) {
  const candidate = value as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") {
    return {
      heading: fallbackHeading,
      body: stringValue(value) || undefined,
    };
  }
  return {
    heading:
      stringValue(candidate.heading || candidate.title || candidate.name) ||
      fallbackHeading,
    body: stringValue(candidate.body || candidate.summary || candidate.content) || undefined,
    bullets: coerceBulletItems(candidate.bullets || candidate.items || candidate.points),
  };
}

function preferredColumnSource(
  primary: unknown,
  alternate: unknown,
  fallback: unknown
) {
  if (isPlaceholderColumn(primary) && alternate) return alternate;
  if (hasColumnContent(primary)) return primary;
  const primaryObject = primary as Record<string, unknown> | null;
  const alternateObject = alternate as Record<string, unknown> | null;
  if (
    primaryObject &&
    typeof primaryObject === "object" &&
    alternateObject &&
    typeof alternateObject === "object"
  ) {
    return {
      ...alternateObject,
      heading:
        stringValue(primaryObject.heading || primaryObject.title || primaryObject.name) ||
        alternateObject.heading,
    };
  }
  return alternate || primary || fallback;
}

function hasColumnContent(value: unknown) {
  const candidate = value as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") return !!stringValue(value);
  return (
    !!stringValue(candidate.body || candidate.summary || candidate.content) ||
    (Array.isArray(candidate.bullets) && candidate.bullets.length > 0) ||
    (Array.isArray(candidate.items) && candidate.items.length > 0) ||
    (Array.isArray(candidate.points) && candidate.points.length > 0)
  );
}

function isPlaceholderColumn(value: unknown) {
  const candidate = value as Record<string, unknown> | null;
  if (!candidate || typeof candidate !== "object") return false;
  const bullets = Array.isArray(candidate.bullets) ? candidate.bullets : [];
  return (
    bullets.length === 1 &&
    stringValue((bullets[0] as { text?: unknown })?.text).toLowerCase() ===
      "content to be refined"
  );
}

function buildColumnFromContentObject(
  content: Record<string, unknown> | null,
  side: "left" | "right"
) {
  if (!content) return undefined;
  const nestedColumn = objectValue(content[`${side}Column`]);
  if (nestedColumn) {
    return {
      heading:
        nestedColumn.heading ||
        nestedColumn.title ||
        nestedColumn.name ||
        content[`${side}Title`],
      body:
        nestedColumn.body ||
        nestedColumn.text ||
        nestedColumn.summary ||
        content[`${side}Body`] ||
        content[`${side}Text`],
      bullets:
        nestedColumn.bullets ||
        nestedColumn.items ||
        nestedColumn.points ||
        content[`${side}Bullets`] ||
        content[`${side}Items`] ||
        content[`${side}Points`],
    };
  }
  return {
    heading: content[`${side}Title`],
    body: content[`${side}Body`] || content[`${side}Text`],
    bullets: content[`${side}Bullets`] || content[`${side}Items`] || content[`${side}Points`],
  };
}

function coerceBulletItems(value: unknown) {
  const strings = coerceStringArray(value);
  if (strings.length > 0) {
    return strings.map((text) => ({ text }));
  }

  if (Array.isArray(value)) {
    const objects = value
      .map((item) => {
        const candidate = item as Record<string, unknown> | null;
        if (!candidate || typeof candidate !== "object") return null;
        const text =
          stringValue(candidate.text) ||
          stringValue(candidate.title) ||
          stringValue(candidate.point);
        return text
          ? {
              text,
              detail: stringValue(candidate.detail || candidate.description) || undefined,
            }
          : null;
      })
      .filter(Boolean);
    if (objects.length > 0) return objects;
  }

  return [{ text: "Content to be refined" }];
}

function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string" || typeof item === "number") {
          return String(item).trim();
        }
        const candidate = item as Record<string, unknown> | null;
        if (!candidate || typeof candidate !== "object") return "";
        return (
          stringValue(candidate.text) ||
          stringValue(candidate.title) ||
          stringValue(candidate.name) ||
          stringValue(candidate.value)
        );
      })
      .filter(Boolean);
  }
  const text = stringValue(value);
  if (!text) return [];
  return text
    .split(/\r?\n|[•・]\s*/u)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function normalizeRowLength(row: string[], length: number) {
  if (row.length === length) return row;
  if (row.length > length) return row.slice(0, length);
  return [...row, ...Array.from({ length: length - row.length }, () => "")];
}

function stringValue(value: unknown): string {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim()
    : "";
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isInteger(parsed) ? parsed : undefined;
  }
  return undefined;
}

function slideIndexToNumber(value: unknown): number | undefined {
  const index = numberValue(value);
  return index === undefined ? undefined : index + 1;
}

function isSupportedTheme(value: unknown): value is PresentationSpec["theme"] {
  return (
    value === "business-clean" ||
    value === "warm-minimal" ||
    value === "executive-dark"
  );
}

function isSupportedDensity(value: unknown): value is PresentationDensity {
  return (
    value === "concise" ||
    value === "standard" ||
    value === "detailed" ||
    value === "dense"
  );
}

function hasContentLikeFields(candidate: Record<string, unknown>) {
  return (
    Array.isArray(candidate.bullets) ||
    Array.isArray(candidate.items) ||
    Array.isArray(candidate.points) ||
    Array.isArray(candidate.rows) ||
    !!candidate.body ||
    !!candidate.content
  );
}

function isSlideSpec(value: unknown): value is SlideSpec {
  const candidate = value as SlideSpec;
  if (!candidate || typeof candidate.title !== "string") return false;

  if (candidate.type === "title" || candidate.type === "section") {
    return true;
  }

  if (candidate.type === "bullets") {
    return (
      Array.isArray(candidate.bullets) &&
      candidate.bullets.length > 0 &&
      candidate.bullets.every(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof (item as { text?: unknown }).text === "string"
      )
    );
  }

  if (candidate.type === "twoColumn") {
    return (
      !!candidate.left &&
      !!candidate.right &&
      typeof candidate.left.heading === "string" &&
      typeof candidate.right.heading === "string" &&
      (candidate.left.bullets === undefined || Array.isArray(candidate.left.bullets)) &&
      (candidate.right.bullets === undefined || Array.isArray(candidate.right.bullets))
    );
  }

  if (candidate.type === "table") {
    return (
      Array.isArray(candidate.columns) &&
      candidate.columns.length >= 2 &&
      Array.isArray(candidate.rows) &&
      candidate.rows.length > 0 &&
      candidate.rows.every(
        (row) => Array.isArray(row) && row.length === candidate.columns.length
      )
    );
  }

  if (candidate.type === "closing") {
    return candidate.nextSteps === undefined || Array.isArray(candidate.nextSteps);
  }

  return false;
}

function isPresentationPatch(value: unknown): value is PresentationPatch {
  const candidate = value as PresentationPatch;
  return (
    !!candidate &&
    candidate.version === "0.1" &&
    Array.isArray(candidate.operations) &&
    candidate.operations.length > 0 &&
    candidate.operations.every(isPresentationPatchOperation)
  );
}

function isPresentationPatchOperation(
  value: unknown
): value is PresentationPatchOperation {
  const candidate = value as PresentationPatchOperation;
  if (!candidate || typeof candidate.op !== "string") return false;
  if (candidate.op === "updateDeck") return true;
  if (candidate.op === "updateSlide") {
    return (
      Number.isInteger(candidate.slideNumber) &&
      !!candidate.patch &&
      typeof candidate.patch === "object"
    );
  }
  if (candidate.op === "replaceSlide") {
    return Number.isInteger(candidate.slideNumber) && isSlideSpec(candidate.slide);
  }
  if (candidate.op === "insertSlide") {
    return Number.isInteger(candidate.afterSlideNumber) && isSlideSpec(candidate.slide);
  }
  if (candidate.op === "deleteSlide") {
    return Number.isInteger(candidate.slideNumber);
  }
  if (candidate.op === "moveSlide") {
    return (
      Number.isInteger(candidate.fromSlideNumber) &&
      Number.isInteger(candidate.toSlideNumber)
    );
  }
  return false;
}

import type { ReferenceLibraryItem, StoredDocument } from "@/types/chat";
import type { ImageGenerationOptions } from "@/lib/server/presentation/imageGeneration";
import type { ImageGenerationUsage } from "@/lib/server/presentation/imageGeneration";
import { buildGeneratedImageDisplayText } from "@/lib/app/image/imageDisplayText";

export type GeneratedImageLibraryPayload = {
  version: "0.1-generated-image";
  imageId: string;
  mimeType: string;
  base64?: string;
  prompt: string;
  originalPrompt?: string;
  revisionInstruction?: string;
  description?: string;
  source?: "generated" | "imported";
  fileName?: string;
  fileSize?: number;
  originalMimeType?: string;
  widthPx?: number;
  heightPx?: number;
  aspectRatio?: number;
  orientation?: "landscape" | "portrait" | "square" | "unknown";
  alt?: string;
  presentationMeta?: GeneratedImagePresentationMeta;
  sourcePromptHash?: string;
  options?: ImageGenerationOptions;
  usage?: ImageGenerationUsage;
  createdAt: string;
};

export type GeneratedImagePresentationMeta = {
  version: "0.3-presentation-image-meta";
  visualBaseType: "photo" | "information_visual" | "mixed" | "unknown";
  visibleSubjects: string[];
  namedEntities?: {
    places: string[];
    stations: string[];
    people: string[];
    organizations: string[];
    landmarks: string[];
  };
  embeddedTextItems: Array<{
    text: string;
    role:
      | "title"
      | "label"
      | "claim"
      | "metric"
      | "brand"
      | "context_sign"
      | "other";
    location?:
      | "top_left"
      | "top_center"
      | "top_right"
      | "center"
      | "bottom_left"
      | "bottom_center"
      | "bottom_right"
      | "wall_or_display"
      | "unknown";
  }>;
  relationships: Array<{
    type:
      | "sequence"
      | "comparison"
      | "alternative"
      | "cause_effect"
      | "hierarchy"
      | "unknown";
    items: string[];
    evidence: string;
  }>;
  composition:
    | "single_scene"
    | "single_subject"
    | "split_panel"
    | "multi_panel"
    | "document_or_display"
    | "dense_scene"
    | "unknown";
  semanticTags: string[];
};

export function isGeneratedImageLibraryPayload(
  value: unknown
): value is GeneratedImageLibraryPayload {
  return (
    !!value &&
    typeof value === "object" &&
    (value as { version?: unknown }).version === "0.1-generated-image" &&
    typeof (value as { imageId?: unknown }).imageId === "string"
  );
}

export function findGeneratedImageByImageId(args: {
  imageId: string;
  referenceLibraryItems: ReferenceLibraryItem[];
}) {
  for (const item of args.referenceLibraryItems) {
    if (item.artifactType !== "generated_image") continue;
    const payload = item.structuredPayload;
    if (!isGeneratedImageLibraryPayload(payload)) continue;
    if (payload.imageId === args.imageId) {
      return { item, payload };
    }
  }
  return null;
}

export function buildGeneratedImageStoredDocument(args: {
  payload: GeneratedImageLibraryPayload;
  title?: string;
}): Omit<StoredDocument, "id" | "sourceType"> {
  const title = args.title?.trim() || `Image ${args.payload.imageId}`;
  const metadataPayload: GeneratedImageLibraryPayload = { ...args.payload };
  delete metadataPayload.base64;
  const text = buildGeneratedImageDisplayText({ payload: args.payload });
  return {
    artifactType: "generated_image",
    title,
    filename: `${args.payload.imageId}.txt`,
    text,
    summary: args.payload.alt || title,
    charCount: text.length,
    structuredPayload: metadataPayload,
    createdAt: args.payload.createdAt,
    updatedAt: args.payload.createdAt,
  };
}

export function buildGeneratedImagePresentationMeta(args: {
  title?: string;
  fileName?: string;
  description?: string;
  prompt?: string;
  originalPrompt?: string;
  widthPx?: number;
  heightPx?: number;
  aspectRatio?: number;
  orientation?: GeneratedImageLibraryPayload["orientation"];
}): GeneratedImagePresentationMeta {
  void args;
  return {
    version: "0.3-presentation-image-meta",
    visualBaseType: "unknown",
    visibleSubjects: [],
    namedEntities: emptyNamedEntities(),
    embeddedTextItems: [],
    relationships: [],
    composition: "unknown",
    semanticTags: [],
  };
}

export function normalizeGeneratedImagePresentationMeta(
  value: unknown,
  fallback: Parameters<typeof buildGeneratedImagePresentationMeta>[0]
): GeneratedImagePresentationMeta {
  const candidate = value && typeof value === "object" ? value as Record<string, unknown> : null;
  if (!candidate) return buildGeneratedImagePresentationMeta(fallback);
  if (candidate.version === "0.1-presentation-image-meta") {
    return normalizeV1PresentationMeta(candidate, fallback);
  }
  if (candidate.version === "0.2-presentation-image-meta") {
    return normalizeV2PresentationMeta(candidate, fallback);
  }
  const defaults = buildGeneratedImagePresentationMeta(fallback);
  return {
    version: "0.3-presentation-image-meta",
    visualBaseType: normalizeVisualBaseType(candidate.visualBaseType) || defaults.visualBaseType,
    visibleSubjects: normalizeStringArray(candidate.visibleSubjects),
    namedEntities: normalizeNamedEntities(candidate.namedEntities),
    embeddedTextItems: normalizeEmbeddedTextItems(candidate.embeddedTextItems),
    relationships: normalizeRelationships(candidate.relationships),
    composition: normalizeComposition(candidate.composition),
    semanticTags: normalizeStringArray(candidate.semanticTags),
  };
}

function normalizeV1PresentationMeta(
  candidate: Record<string, unknown>,
  fallback: Parameters<typeof buildGeneratedImagePresentationMeta>[0]
): GeneratedImagePresentationMeta {
  const visualInfoType = typeof candidate.visualInfoType === "string"
    ? candidate.visualInfoType
    : "unknown";
  const informationVisual =
    visualInfoType === "diagram" ||
    visualInfoType === "chart" ||
    visualInfoType === "table" ||
    visualInfoType === "map";
  const isPhoto =
    visualInfoType === "photo_scene" || visualInfoType === "photo_evidence";
  return {
    version: "0.3-presentation-image-meta",
    visualBaseType: informationVisual
      ? "information_visual"
      : isPhoto
        ? "photo"
        : visualInfoType === "text_heavy"
          ? "mixed"
          : "unknown",
    visibleSubjects: normalizeStringArray(candidate.semanticTags),
    namedEntities: normalizeNamedEntities(candidate.namedEntities),
    embeddedTextItems: [],
    relationships: [],
    composition: normalizeComposition(candidate.composition || fallback.orientation),
    semanticTags: normalizeStringArray(candidate.semanticTags),
  };
}

function normalizeV2PresentationMeta(
  candidate: Record<string, unknown>,
  fallback: Parameters<typeof buildGeneratedImagePresentationMeta>[0]
): GeneratedImagePresentationMeta {
  return {
    version: "0.3-presentation-image-meta",
    visualBaseType:
      normalizeVisualBaseType(candidate.visualBaseType) ||
      buildGeneratedImagePresentationMeta(fallback).visualBaseType,
    visibleSubjects: normalizeStringArray(candidate.semanticTags),
    namedEntities: normalizeNamedEntities(candidate.namedEntities),
    embeddedTextItems: normalizeEmbeddedTextItems(candidate.embeddedTextItems),
    relationships: normalizeStringArray(candidate.processStages).length
      ? [
          {
            type: "sequence",
            items: normalizeStringArray(candidate.processStages),
            evidence: "Converted from legacy processStages metadata; verify against slide context.",
          },
        ]
      : [],
    composition: normalizeComposition(candidate.composition),
    semanticTags: normalizeStringArray(candidate.semanticTags),
  };
}

function normalizeVisualBaseType(
  value: unknown
): GeneratedImagePresentationMeta["visualBaseType"] | null {
  return value === "photo" ||
    value === "information_visual" ||
    value === "mixed" ||
    value === "unknown"
    ? value
    : null;
}

function normalizeEmbeddedTextItems(value: unknown): GeneratedImagePresentationMeta["embeddedTextItems"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!text) return [];
    return [{
      text,
      role: normalizeEmbeddedTextRole(record.role),
      location: normalizeTextLocation(record.location),
    }];
  });
}

function normalizeEmbeddedTextRole(
  value: unknown
): GeneratedImagePresentationMeta["embeddedTextItems"][number]["role"] {
  return value === "title" ||
    value === "label" ||
    value === "claim" ||
    value === "metric" ||
    value === "brand" ||
    value === "context_sign" ||
    value === "other"
    ? value
    : "other";
}

function normalizeTextLocation(
  value: unknown
): GeneratedImagePresentationMeta["embeddedTextItems"][number]["location"] {
  return value === "top_left" ||
    value === "top_center" ||
    value === "top_right" ||
    value === "center" ||
    value === "bottom_left" ||
    value === "bottom_center" ||
    value === "bottom_right" ||
    value === "wall_or_display" ||
    value === "unknown"
    ? value
    : "unknown";
}

function normalizeRelationships(value: unknown): GeneratedImagePresentationMeta["relationships"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const items = normalizeStringArray(record.items);
    const evidence = typeof record.evidence === "string" ? record.evidence.trim() : "";
    if (items.length === 0 && !evidence) return [];
    return [{
      type: normalizeRelationshipType(record.type),
      items,
      evidence,
    }];
  });
}

function emptyNamedEntities(): GeneratedImagePresentationMeta["namedEntities"] {
  return {
    places: [],
    stations: [],
    people: [],
    organizations: [],
    landmarks: [],
  };
}

function normalizeNamedEntities(value: unknown): GeneratedImagePresentationMeta["namedEntities"] {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    places: normalizeStringArray(record.places),
    stations: normalizeStringArray(record.stations),
    people: normalizeStringArray(record.people),
    organizations: normalizeStringArray(record.organizations),
    landmarks: normalizeStringArray(record.landmarks),
  };
}

function normalizeRelationshipType(
  value: unknown
): GeneratedImagePresentationMeta["relationships"][number]["type"] {
  return value === "sequence" ||
    value === "comparison" ||
    value === "alternative" ||
    value === "cause_effect" ||
    value === "hierarchy" ||
    value === "unknown"
    ? value
    : "unknown";
}

function normalizeComposition(
  value: unknown
): GeneratedImagePresentationMeta["composition"] {
  return value === "single_scene" ||
    value === "single_subject" ||
    value === "split_panel" ||
    value === "multi_panel" ||
    value === "document_or_display" ||
    value === "dense_scene" ||
    value === "unknown"
    ? value
    : "unknown";
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && !!item.trim())
    : [];
}

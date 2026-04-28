import type { StoredDocument } from "@/types/chat";
import type {
  PresentationLibraryPayload,
  PresentationOutput,
  PresentationPatch,
  PresentationSpec,
} from "@/lib/app/presentation/presentationTypes";
import {
  buildPresentationPayloadPreviewText,
  buildPresentationPayloadSummary,
  buildPresentationPreviewText,
  buildPresentationSummary,
} from "@/lib/app/presentation/presentationPreviewText";

export function buildPresentationDocumentId(timestamp = new Date()) {
  const stamp = timestamp
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  return `pres_${stamp}_${Math.random().toString(36).slice(2, 8)}`;
}

export function serializePresentationPayload(payload: PresentationLibraryPayload) {
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parsePresentationPayload(text: string): PresentationLibraryPayload | null {
  try {
    const parsed = JSON.parse(text) as PresentationLibraryPayload;
    if (
      parsed?.kind !== "kin.presentation" ||
      parsed?.version !== "0.1" ||
      !parsed?.documentId ||
      !parsed?.spec?.title ||
      !Array.isArray(parsed?.spec?.slides)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function buildPresentationLibraryPayload(args: {
  spec: PresentationSpec;
  documentId?: string;
  patches?: PresentationPatch[];
  outputs?: PresentationOutput[];
  status?: PresentationLibraryPayload["status"];
  timestamp?: string;
}): PresentationLibraryPayload {
  const timestamp = args.timestamp || new Date().toISOString();
  const previewText = buildPresentationPreviewText(args.spec);
  const summary = buildPresentationSummary(args.spec);

  return {
    kind: "kin.presentation",
    version: "0.1",
    documentId: args.documentId || buildPresentationDocumentId(new Date(timestamp)),
    status: args.status || "draft",
    spec: args.spec,
    patches: args.patches || [],
    outputs: args.outputs || [],
    previewText,
    summary,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function rebuildPresentationLibraryPayload(
  previous: PresentationLibraryPayload,
  updates: {
    spec?: PresentationSpec;
    patches?: PresentationPatch[];
    outputs?: PresentationOutput[];
    status?: PresentationLibraryPayload["status"];
    timestamp?: string;
  }
): PresentationLibraryPayload {
  const timestamp = updates.timestamp || new Date().toISOString();
  const spec = updates.spec || previous.spec;
  const draftPayload: PresentationLibraryPayload = {
    ...previous,
    spec,
    patches: updates.patches || previous.patches,
    outputs: updates.outputs || previous.outputs,
    status: updates.status || previous.status,
    previewText: buildPresentationPreviewText(spec),
    updatedAt: timestamp,
  };
  return {
    ...draftPayload,
    previewText: buildPresentationPayloadPreviewText(draftPayload),
    summary: buildPresentationPayloadSummary(draftPayload),
  };
}

export function buildPresentationStoredDocument(args: {
  payload: PresentationLibraryPayload;
  title?: string;
}): Omit<StoredDocument, "id" | "sourceType"> {
  const title = args.title || args.payload.spec.title;
  const text = serializePresentationPayload(args.payload);
  return {
    artifactType: "presentation",
    title,
    filename: `${args.payload.documentId}.presentation.json`,
    text,
    summary: args.payload.summary,
    charCount: text.length,
    createdAt: args.payload.createdAt,
    updatedAt: args.payload.updatedAt,
  };
}

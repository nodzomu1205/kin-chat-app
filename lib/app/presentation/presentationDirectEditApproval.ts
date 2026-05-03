import type { PresentationTaskPlan } from "@/types/task";

export type PptDirectEditBlockType = "text" | "visual";

export type PptDirectEditVisualMode =
  | "library_image"
  | "generate_image"
  | "revise_prompt"
  | "none";

export type PptDirectEditBlockEdit = {
  id: string;
  slideNumber: number;
  blockNumber: number;
  blockId: string;
  blockType: PptDirectEditBlockType;
  blockKind: string;
  instruction: string;
  currentText: string;
  proposedText?: string;
  visualMode?: PptDirectEditVisualMode;
  imageId?: string;
  generationPrompt?: string;
  visualBrief?: string;
  accepted?: boolean;
};

export type PptDirectEditCandidate = {
  id: string;
  documentId: string;
  instruction: string;
  targetSummary?: string;
  changeSummary?: string;
  edits?: PptDirectEditBlockEdit[];
  planText: string;
  plan: PresentationTaskPlan;
  createdAt: string;
  updatedAt: string;
};

export type PptDirectEditCandidatePatch = Partial<
  Pick<
    PptDirectEditCandidate,
    | "instruction"
    | "targetSummary"
    | "changeSummary"
    | "edits"
    | "updatedAt"
  >
>;

export type ApprovedPptDirectEdit = PptDirectEditCandidate & {
  approvedAt: string;
  approvedCount: number;
};

const PENDING_KEY = "kin.pptDirectEdit.pending.v1";
const APPROVED_KEY = "kin.pptDirectEdit.approved.v1";
export const PPT_DIRECT_EDIT_APPROVAL_EVENT =
  "kin:ppt-direct-edit-approval-change";

function readJsonArray<T>(storage: Storage | null, key: string): T[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(storage: Storage | null, key: string, value: T[]) {
  if (!storage) return;
  storage.setItem(key, JSON.stringify(value));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PPT_DIRECT_EDIT_APPROVAL_EVENT));
  }
}

export function normalizePptDirectEditInstruction(value: string) {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function buildPptDirectEditSignature(args: {
  documentId: string;
  instruction: string;
}) {
  return [
    args.documentId.trim().toLowerCase(),
    normalizePptDirectEditInstruction(args.instruction),
  ].join("\n");
}

export function buildPptDirectEditTargetSummary(
  edits: Array<Pick<PptDirectEditBlockEdit, "slideNumber" | "blockNumber">>
) {
  if (edits.length === 0) return "";
  return edits
    .map((edit) => `Slide ${edit.slideNumber} / Block ${edit.blockNumber}`)
    .join(", ");
}

function sameDirectEdit(a: { documentId: string; instruction: string }, b: {
  documentId: string;
  instruction: string;
}) {
  return buildPptDirectEditSignature(a) === buildPptDirectEditSignature(b);
}

export function loadPendingPptDirectEditCandidates(storage: Storage | null) {
  return readJsonArray<PptDirectEditCandidate>(storage, PENDING_KEY);
}

export function loadApprovedPptDirectEdits(storage: Storage | null) {
  return readJsonArray<ApprovedPptDirectEdit>(storage, APPROVED_KEY);
}

export function findPendingPptDirectEditCandidate(args: {
  storage: Storage | null;
  documentId: string;
  instruction: string;
}) {
  return loadPendingPptDirectEditCandidates(args.storage).find((candidate) =>
    sameDirectEdit(candidate, args)
  );
}

function compactPptDirectEditCandidate<T extends PptDirectEditCandidate>(
  candidate: T
): T {
  const { latestPptx: _latestPptx, debug: _debug, ...plan } = candidate.plan;
  return {
    ...candidate,
    planText: "",
    plan,
  } as T;
}

export function findApprovedPptDirectEdit(args: {
  storage: Storage | null;
  documentId: string;
  instruction: string;
}) {
  return loadApprovedPptDirectEdits(args.storage).find((approved) =>
    sameDirectEdit(approved, args)
  );
}

export function savePendingPptDirectEditCandidate(args: {
  storage: Storage | null;
  candidate: PptDirectEditCandidate;
}) {
  const approved = loadApprovedPptDirectEdits(args.storage).map(
    compactPptDirectEditCandidate
  );
  writeJsonArray(args.storage, APPROVED_KEY, approved.slice(0, 10));
  const pending = loadPendingPptDirectEditCandidates(args.storage);
  const compactCandidate = compactPptDirectEditCandidate(args.candidate);
  const next = [
    compactCandidate,
    ...pending
      .map(compactPptDirectEditCandidate)
      .filter((item) => !sameDirectEdit(item, compactCandidate)),
  ].slice(0, 5);
  writeJsonArray(args.storage, PENDING_KEY, next);
}

export function updatePendingPptDirectEditCandidate(args: {
  storage: Storage | null;
  candidateId: string;
  patch: PptDirectEditCandidatePatch;
}) {
  const pending = loadPendingPptDirectEditCandidates(args.storage);
  const next = pending.map((candidate) =>
    candidate.id === args.candidateId
      ? compactPptDirectEditCandidate({
          ...candidate,
          ...args.patch,
          updatedAt: args.patch.updatedAt || new Date().toISOString(),
        })
      : candidate
  );
  writeJsonArray(args.storage, PENDING_KEY, next);
}

function applyBlockText(
  block: PresentationTaskPlan["slideFrames"][number]["blocks"][number],
  text: string
) {
  const normalizeItems = (value: string) =>
    value
      .split(/\r?\n| \/ /)
      .map((item) => item.replace(/^[-*\u30fb\u2022]\s*/, "").trim())
      .filter(Boolean);

  if (block.kind === "list") {
    return {
      ...block,
      text: undefined,
      items: normalizeItems(text),
    };
  }
  if (block.kind === "textStack" || block.kind === "callout") {
    return {
      ...block,
      text,
      items: undefined,
    };
  }
  return block;
}

function normalizeBlockType(
  value: string | undefined,
  block: PresentationTaskPlan["slideFrames"][number]["blocks"][number]
): PptDirectEditBlockType {
  if (value === "visual" || block.visualRequest || block.kind === "visual") {
    return "visual";
  }
  return "text";
}

function applyBlockVisual(
  block: PresentationTaskPlan["slideFrames"][number]["blocks"][number],
  edit: PptDirectEditBlockEdit
) {
  const { asset: _asset, ...currentWithoutAsset } = block.visualRequest || {
    type: "illustration" as const,
    brief: "",
  };
  const current = currentWithoutAsset;
  const nextBrief =
    edit.visualBrief?.trim() ||
    edit.proposedText?.trim() ||
    current.brief ||
    edit.instruction;
  const nextPrompt =
    edit.generationPrompt?.trim() ||
    (edit.visualMode === "generate_image" ? nextBrief : current.prompt);
  return {
    ...block,
    kind: "visual" as const,
    visualRequest: {
      ...current,
      brief: nextBrief,
      prompt: nextPrompt || undefined,
      preferredImageId:
        edit.visualMode === "library_image"
          ? edit.imageId?.trim() || current.preferredImageId
          : edit.visualMode === "none"
            ? current.preferredImageId
            : undefined,
      promptNote:
        edit.visualMode === "generate_image" && !nextPrompt
          ? edit.instruction
          : current.promptNote,
    },
  };
}

function parseTargetFromEdit(edit: PptDirectEditBlockEdit) {
  const blockId = edit.blockId?.trim();
  return {
    slideNumber: Number(edit.slideNumber) || 1,
    blockNumber: Number(edit.blockNumber) || 1,
    blockId,
  };
}

export function materializePptDirectEditCandidate(
  candidate: PptDirectEditCandidate
): PptDirectEditCandidate {
  const activeEdits = (candidate.edits || []).filter(
    (edit) => edit.accepted !== false
  );
  if (activeEdits.length > 0) {
    return {
      ...candidate,
      plan: {
        ...candidate.plan,
        slideFrames: candidate.plan.slideFrames.map((slide) => {
          const slideEdits = activeEdits.filter(
            (edit) => Number(edit.slideNumber) === slide.slideNumber
          );
          if (slideEdits.length === 0) return slide;
          return {
            ...slide,
            blocks: slide.blocks.map((block, index) => {
              const edit = slideEdits.find((item) => {
                const target = parseTargetFromEdit(item);
                return target.blockId
                  ? block.id === target.blockId
                  : index === target.blockNumber - 1;
              });
              if (!edit) return block;
              const blockType = normalizeBlockType(edit.blockType, block);
              if (blockType === "visual") return applyBlockVisual(block, edit);
              const nextText = edit.proposedText?.trim();
              return nextText ? applyBlockText(block, nextText) : block;
            }),
          };
        }),
        updatedAt: new Date().toISOString(),
      },
    };
  }

  return candidate;
}

export function approvePptDirectEditCandidate(args: {
  storage: Storage | null;
  candidateId: string;
}) {
  const pending = loadPendingPptDirectEditCandidates(args.storage);
  const candidate = pending.find((item) => item.id === args.candidateId);
  if (!candidate) return;
  const compactCandidate = compactPptDirectEditCandidate(
    materializePptDirectEditCandidate(candidate)
  );
  const approved = loadApprovedPptDirectEdits(args.storage).map(
    compactPptDirectEditCandidate
  );
  const existing = approved.find((item) =>
    sameDirectEdit(item, compactCandidate)
  );
  const now = new Date().toISOString();
  const nextApproved: ApprovedPptDirectEdit[] = existing
    ? approved.map((item) =>
        item.id === existing.id
          ? {
              ...item,
              ...compactCandidate,
              approvedAt: now,
              approvedCount: (item.approvedCount || 0) + 1,
            }
          : item
      )
    : [
        {
          ...compactCandidate,
          approvedAt: now,
          approvedCount: 1,
        },
        ...approved,
      ];
  writeJsonArray(
    args.storage,
    PENDING_KEY,
    pending.filter((item) => item.id !== args.candidateId)
  );
  writeJsonArray(args.storage, APPROVED_KEY, nextApproved.slice(0, 10));
}

export function rejectPptDirectEditCandidate(args: {
  storage: Storage | null;
  candidateId: string;
}) {
  const pending = loadPendingPptDirectEditCandidates(args.storage);
  writeJsonArray(
    args.storage,
    PENDING_KEY,
    pending.filter((item) => item.id !== args.candidateId)
  );
}

export function deleteApprovedPptDirectEdit(args: {
  storage: Storage | null;
  approvedId: string;
}) {
  const approved = loadApprovedPptDirectEdits(args.storage);
  writeJsonArray(
    args.storage,
    APPROVED_KEY,
    approved.filter((item) => item.id !== args.approvedId)
  );
}

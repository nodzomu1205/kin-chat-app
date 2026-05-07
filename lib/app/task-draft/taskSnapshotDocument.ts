export type TaskSnapshotPayload = {
  version: "0.1-task-snapshot";
  documentId: string;
  title?: string;
  mode?: "normal" | "presentation";
};

const TASK_SNAPSHOT_DOCUMENT_ID_PATTERN =
  /^Document ID\s*:\s*(task_[A-Za-z0-9_-]+)/im;
const ANY_DOCUMENT_ID_LINE_PATTERN = /^Document ID\s*:\s*[^\n\r]+(?:\r?\n)?/gim;

export function buildTaskSnapshotDocumentId(date = new Date()) {
  const timestamp = date
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  return `task_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
}

export function isTaskSnapshotPayload(value: unknown): value is TaskSnapshotPayload {
  return (
    !!value &&
    typeof value === "object" &&
    (value as TaskSnapshotPayload).version === "0.1-task-snapshot" &&
    typeof (value as TaskSnapshotPayload).documentId === "string"
  );
}

export function resolveTaskSnapshotDocumentId(value: unknown) {
  return isTaskSnapshotPayload(value) ? value.documentId.trim() : "";
}

export function extractTaskSnapshotDocumentIdFromText(text: string) {
  return text.match(TASK_SNAPSHOT_DOCUMENT_ID_PATTERN)?.[1]?.trim() || "";
}

export function ensureTaskSnapshotDocumentText(args: {
  text: string;
  documentId: string;
}) {
  const normalized = args.text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return `Document ID: ${args.documentId}`;
  const withoutDocumentIds = normalized
    .replace(ANY_DOCUMENT_ID_LINE_PATTERN, "")
    .trim();
  return [`Document ID: ${args.documentId}`, withoutDocumentIds]
    .filter(Boolean)
    .join("\n\n");
}

export function stripTaskSnapshotTitlePrefix(title: string) {
  return title.replace(/^Task Snapshot\s*-\s*/i, "").trim();
}

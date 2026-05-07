const PPT_PREFIX_PATTERN = /^\s*\/ppt(?:\s|$)/i;
const DOCUMENT_ID_PATTERN = /^\s*Document ID\s*:\s*([A-Za-z0-9_.:_-]+)/im;
const RESOLVE_VISUALS_PATTERN = /^\s*Resolve visuals\s*$/im;
const VISUAL_SELECTION_LINE_PATTERN =
  /^\s*((?:Slide\s+\d+\s*\/\s*block\s+\d+)|(?:Opening\s+slide\s*\/\s*visual))\s*:\s*(.*)$/i;

export function mergePresentationResolveVisualCommandDraft(
  currentText: string,
  nextCommand: string
) {
  const next = parseResolveVisualCommand(nextCommand);
  if (!next) return nextCommand;
  const current = parseResolveVisualCommand(currentText);
  if (!current || current.documentId !== next.documentId) return nextCommand;

  const linesByAddress = new Map<string, string>();
  current.selectionLines.forEach((line) => linesByAddress.set(normalizeAddress(line.address), line.line));
  next.selectionLines.forEach((line) => linesByAddress.set(normalizeAddress(line.address), line.line));

  return [
    "/ppt",
    `Document ID: ${next.documentId}`,
    "Resolve visuals",
    ...Array.from(linesByAddress.values()),
  ].join("\n");
}

function parseResolveVisualCommand(text: string) {
  if (!PPT_PREFIX_PATTERN.test(text)) return null;
  if (!RESOLVE_VISUALS_PATTERN.test(text)) return null;
  const documentId = text.match(DOCUMENT_ID_PATTERN)?.[1]?.trim();
  if (!documentId) return null;
  const selectionLines = text
    .split(/\r?\n/)
    .flatMap((line) => {
      const match = line.match(VISUAL_SELECTION_LINE_PATTERN);
      if (!match) return [];
      return [
        {
          address: match[1],
          line: `${match[1]}: ${match[2] || ""}`,
        },
      ];
    });
  if (selectionLines.length === 0) return null;
  return { documentId, selectionLines };
}

function normalizeAddress(address: string) {
  return address.replace(/\s+/g, " ").trim().toLowerCase();
}

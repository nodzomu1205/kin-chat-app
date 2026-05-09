const PPT_MARKER = /(?:^|\s)\/ppt(?:\s|$)/i;

export function isPresentationTaskInstruction(text: string) {
  return PPT_MARKER.test(text);
}

export function stripPresentationTaskMarker(text: string) {
  return text
    .replace(PPT_MARKER, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .join("\n")
    .trim();
}

export function buildPresentationTaskStructuredInput(args: {
  title?: string;
  userInstruction?: string;
  body?: string;
  material?: string;
  currentPlanText?: string;
  libraryReferenceContext?: string;
  imageLibraryContext?: string;
}) {
  return [
    `\u30d7\u30ec\u30bc\u30f3\u30bf\u30a4\u30c8\u30eb: ${args.title?.trim() || "\u672a\u8a2d\u5b9a"}`,
    `\u30e6\u30fc\u30b6\u30fc\u6307\u793a: ${args.userInstruction?.trim() || "\u306a\u3057"}`,
    args.currentPlanText?.trim()
      ? `\u73fe\u5728\u306ePPT\u8a2d\u8a08\u66f8:\n${args.currentPlanText.trim()}`
      : "",
    args.body?.trim() ? `\u5165\u529b\u672c\u6587:\n${args.body.trim()}` : "",
    args.material?.trim() ? `\u53d6\u8fbc\u7d20\u6750:\n${args.material.trim()}` : "",
  ].concat(
    args.libraryReferenceContext?.trim()
      ? [`Library reference context:\n${args.libraryReferenceContext.trim()}`]
      : []
  )
    .concat(
    args.imageLibraryContext?.trim()
      ? [`Image library reference candidates:\n${args.imageLibraryContext.trim()}`]
      : []
    )
    .concat(
      args.imageLibraryContext?.trim()
        ? [
            [
              "Image library selection policy:",
              "- Do not refer to a specific image-library asset by identifier.",
              "- For visual blocks that may use image-library assets, provide visualRequest.visualSlots instead.",
              "- Each visualSlot must describe exactly one needed image with slotId, label, need, optional keywords, and order.",
              "- The app will match visualSlots to image-library metadata deterministically after your JSON is parsed.",
              "- Keep slot order aligned with the corresponding text order, such as upstream, midstream, downstream.",
              "- If a slide has no concrete image need, omit visualSlots instead of forcing a vague slot.",
            ].join("\n"),
          ]
        : []
    )
    .filter(Boolean)
    .join("\n\n");
}

export function resolvePresentationTaskTitle(args: {
  presentationMode: boolean;
  explicitTitle?: string;
  currentTitle?: string;
  currentTaskName?: string;
  generatedTitle?: string;
  fallbackTitle: string;
  preserveExistingTitle: boolean;
}) {
  if (!args.presentationMode) {
    return args.generatedTitle || args.fallbackTitle;
  }

  const explicitTitle = args.explicitTitle?.trim();
  if (explicitTitle) return explicitTitle;

  if (args.preserveExistingTitle) {
    const existingTitle =
      args.currentTitle?.trim() || args.currentTaskName?.trim();
    if (existingTitle) return existingTitle;
  }

  return args.generatedTitle || args.fallbackTitle;
}

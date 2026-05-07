export function buildPresentationRenderedMessage(args: {
  documentId: string;
  title: string;
  slideCount: number;
  outputPath: string;
  filename: string;
}) {
  return [
    "Presentation PPTX created.",
    "",
    `Document ID: ${args.documentId}`,
    `Title: ${args.title}`,
    `Slides: ${args.slideCount}`,
    "",
    args.outputPath ? `PPTX: [${args.filename}](${args.outputPath})` : "",
    `File: ${args.filename}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPresentationCommandFailureMessage(args: {
  action: "renderPptx";
  error: unknown;
}) {
  const detail = args.error instanceof Error ? args.error.message : String(args.error);
  return [
    "Could not create the presentation PPTX.",
    "",
    detail,
    "",
    "Please confirm the Document ID points to a saved PPT design document and try the render command again.",
  ].join("\n");
}

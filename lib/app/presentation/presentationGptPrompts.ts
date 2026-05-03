export function buildPresentationRenderedMessage(args: {
  documentId: string;
  title: string;
  slideCount: number;
  outputPath: string;
  filename: string;
  generatedImages?: Array<{
    imageId: string;
    title?: string;
    path?: string;
  }>;
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
    args.generatedImages?.length ? "" : "",
    ...(args.generatedImages || []).flatMap((image) => [
      `Image ID: ${image.imageId}`,
      image.title ? `Image: ${image.title}` : "",
      image.path ? `![${image.imageId}](${image.path})` : "",
    ]),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPresentationRevisedMessage(args: {
  documentId: string;
  title: string;
  slideCount: number;
  outputPath: string;
  filename: string;
}) {
  return [
    "Presentation PPTX revised.",
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
  action: "renderPptx" | "reviseRenderedPptx";
  error: unknown;
}) {
  const detail = args.error instanceof Error ? args.error.message : String(args.error);
  const actionLine =
    args.action === "reviseRenderedPptx"
      ? "Could not revise the presentation PPTX."
      : "Could not create the presentation PPTX.";
  return [
    actionLine,
    "",
    detail,
    "",
    "Please confirm the Document ID points to a saved PPT design document and try the render command again.",
  ].join("\n");
}

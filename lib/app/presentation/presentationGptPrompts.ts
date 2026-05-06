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
  imageMatches?: Array<{
    slideNumber: number;
    label: string;
    status: "selected" | "unresolved";
    imageId?: string;
    imageTitle?: string;
    score: number;
    threshold: number;
  }>;
}) {
  const generatedImages = uniqueGeneratedImages(args.generatedImages || []);
  return [
    "Presentation PPTX created.",
    "",
    `Document ID: ${args.documentId}`,
    `Title: ${args.title}`,
    `Slides: ${args.slideCount}`,
    "",
    args.outputPath ? `PPTX: [${args.filename}](${args.outputPath})` : "",
    `File: ${args.filename}`,
    generatedImages.length ? "" : "",
    ...generatedImages.flatMap((image) => [
      `Image ID: ${image.imageId}`,
      image.title ? `Image: ${image.title}` : "",
      image.path ? `![${image.imageId}](${image.path})` : "",
    ]),
    args.imageMatches?.length ? "" : "",
    ...(args.imageMatches || []).flatMap((match) => [
      `Slide ${match.slideNumber} image match: ${match.label}`,
      `Status: ${match.status}`,
      `Score: ${match.score} / Threshold: ${match.threshold}`,
      match.imageId ? `Image ID: ${match.imageId}` : "",
      match.imageTitle ? `Image: ${match.imageTitle}` : "",
    ]),
  ]
    .filter(Boolean)
    .join("\n");
}

function uniqueGeneratedImages(
  images: Array<{
    imageId: string;
    title?: string;
    path?: string;
  }>
) {
  const seen = new Set<string>();
  return images.filter((image) => {
    const key = image.imageId || image.path || image.title || "";
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

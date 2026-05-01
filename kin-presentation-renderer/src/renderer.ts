import PptxGenJS from "pptxgenjs";
import type {
  BulletItem,
  CardContent,
  ColumnContent,
  FrameBlock,
  FramePresentationSpec,
  PresentationDensity,
  PresentationSpec,
  SlideSpec
} from "./schema.js";
import { resolveTheme, type RendererTheme } from "./themes.js";

const layout = {
  width: 13.333,
  height: 7.5,
  marginX: 0.62,
  topY: 0.48,
  footerY: 7.08
};

type FrameRenderContext = {
  density: PresentationDensity;
  typography?: NonNullable<FramePresentationSpec["deckFrame"]>["typography"];
};

export async function renderPresentationToFile(
  spec: PresentationSpec,
  outputPath: string
): Promise<void> {
  const pptx = renderPresentation(spec);
  await pptx.writeFile({ fileName: outputPath });
}

export async function renderFramePresentationToFile(
  spec: FramePresentationSpec,
  outputPath: string
): Promise<void> {
  const pptx = renderFramePresentation(spec);
  await pptx.writeFile({ fileName: outputPath });
}

export function renderPresentation(spec: PresentationSpec): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Kin Presentation Renderer";
  pptx.subject = spec.purpose ?? spec.title;
  pptx.title = spec.title;
  pptx.company = "Kin";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos"
  };

  const theme = resolveTheme(spec.theme);
  spec.slides.forEach((slideSpec, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: theme.background };
    renderSlide(
      slide,
      slideSpec,
      theme,
      spec.density ?? "standard",
      index + 1,
      spec.slides.length
    );
  });

  return pptx;
}

export function renderFramePresentation(spec: FramePresentationSpec): PptxGenJS {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Kin Presentation Renderer";
  pptx.subject = spec.title;
  pptx.title = spec.title;
  pptx.company = "Kin";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos"
  };

  const theme = resolveTheme(spec.theme);
  spec.slideFrames.forEach((frame, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: theme.background };
    renderFrameSlide(
      slide,
      frame,
      theme,
      {
        density: spec.density ?? "standard",
        typography: spec.deckFrame?.typography
      },
      index + 1,
      spec.deckFrame?.slideCount || spec.slideFrames.length,
      spec.deckFrame?.pageNumber?.enabled ?? true
    );
  });

  return pptx;
}

function renderSlide(
  slide: PptxGenJS.Slide,
  slideSpec: SlideSpec,
  theme: RendererTheme,
  density: PresentationDensity,
  slideNumber: number,
  slideCount: number
): void {
  switch (slideSpec.type) {
    case "title":
      renderTitleSlide(slide, slideSpec, theme);
      break;
    case "section":
      renderSectionSlide(slide, slideSpec, theme);
      break;
    case "bullets":
      renderBulletsSlide(slide, slideSpec, theme, density);
      break;
    case "twoColumn":
      renderTwoColumnSlide(slide, slideSpec, theme, density);
      break;
    case "table":
      renderTableSlide(slide, slideSpec, theme);
      break;
    case "cards":
      renderCardsSlide(slide, slideSpec, theme, density);
      break;
    case "closing":
      renderClosingSlide(slide, slideSpec, theme);
      break;
  }

  if (slideSpec.type !== "title") {
    addFooter(slide, theme, slideNumber, slideCount);
  }

  if ("notes" in slideSpec && slideSpec.notes) {
    slide.addNotes(slideSpec.notes);
  }
}

function renderFrameSlide(
  slide: PptxGenJS.Slide,
  frame: FramePresentationSpec["slideFrames"][number],
  theme: RendererTheme,
  context: FrameRenderContext,
  slideNumber: number,
  slideCount: number,
  showPageNumber: boolean
): void {
  if (frame.layoutFrameId === "singleCenter") {
    renderFrameSingleCenter(slide, frame, theme, context);
  } else {
    addSlideTitle(slide, theme, frame.title);
    switch (frame.layoutFrameId) {
      case "visualLeftTextRight":
      case "textLeftVisualRight":
      case "leftRight50":
        renderFrameTwoColumn(slide, frame.blocks[0], frame.blocks[1], theme, context);
        break;
      case "heroTopDetailsBottom":
        renderFrameHeroDetails(slide, frame.title, frame.blocks, theme, context);
        break;
      case "threeColumns":
        renderFrameColumns(slide, frame.blocks.slice(0, 3), theme, context);
        break;
      case "twoByTwoGrid":
        renderFrameGrid(slide, frame.blocks.slice(0, 4), theme, context);
        break;
      case "titleBody":
      default:
        renderFrameTitleBody(slide, frame.blocks[0], theme, context);
        break;
    }
  }

  if (showPageNumber) {
    addFooter(slide, theme, slideNumber, slideCount);
  }

  if (frame.speakerIntent) {
    slide.addNotes(frame.speakerIntent);
  }
}

function renderFrameSingleCenter(
  slide: PptxGenJS.Slide,
  frame: FramePresentationSpec["slideFrames"][number],
  theme: RendererTheme,
  context: FrameRenderContext
): void {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: layout.width,
    h: layout.height,
    fill: { color: theme.background },
    line: { color: theme.background }
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 0.18,
    h: layout.height,
    fill: { color: theme.accent },
    line: { color: theme.accent }
  });
  slide.addText(frame.title, {
    x: 0.78,
    y: 1.28,
    w: 10.6,
    h: 0.82,
    fontFace: theme.fontFace,
    fontSize: 34,
    bold: true,
    color: theme.text,
    fit: "shrink",
    margin: 0
  });
  const message = blockDisplayText(frame.blocks[0]);
  if (message) {
    slide.addText(message, {
      x: 0.82,
      y: 2.72,
      w: 10.8,
      h: 0.82,
      fontFace: theme.fontFace,
      fontSize: 20 * (context.typography?.bodyScale || 1),
      color: theme.mutedText,
      fit: "shrink",
      margin: 0
    });
  }
}

function renderFrameTwoColumn(
  slide: PptxGenJS.Slide,
  leftBlock: FrameBlock | undefined,
  rightBlock: FrameBlock | undefined,
  theme: RendererTheme,
  context: FrameRenderContext
): void {
  const y = 1.56;
  renderFrameBlock(slide, leftBlock, theme, { x: 0.76, y, w: 5.65, h: 4.75 }, context);
  renderFrameBlock(slide, rightBlock, theme, { x: 6.92, y, w: 5.65, h: 4.75 }, context);
}

function renderFrameHeroDetails(
  slide: PptxGenJS.Slide,
  title: string,
  blocks: FrameBlock[],
  theme: RendererTheme,
  context: FrameRenderContext
): void {
  const [first, ...rest] = blocks;
  const firstText = blockDisplayText(first);
  const showHero = !!first && !isRedundantFrameText(title, firstText);
  if (showHero) {
    renderFrameBlock(slide, first, theme, { x: 0.76, y: 1.42, w: 11.8, h: 1.0 }, context);
  }
  const detailBlocks = showHero ? rest : blocks.filter((block) => block !== first);
  const y = showHero ? 2.9 : 1.55;
  const h = showHero ? 2.85 : 4.25;
  renderFrameBlock(slide, detailBlocks[0], theme, { x: 0.76, y, w: 5.72, h }, context);
  renderFrameBlock(slide, detailBlocks[1], theme, { x: 6.86, y, w: 5.72, h }, context);
}

function renderFrameColumns(
  slide: PptxGenJS.Slide,
  blocks: FrameBlock[],
  theme: RendererTheme,
  context: FrameRenderContext
): void {
  const gap = 0.28;
  const w = (11.8 - gap * 2) / 3;
  blocks.forEach((block, index) => {
    renderFrameBlock(slide, block, theme, { x: 0.76 + index * (w + gap), y: 1.55, w, h: 4.65 }, context);
  });
}

function renderFrameGrid(
  slide: PptxGenJS.Slide,
  blocks: FrameBlock[],
  theme: RendererTheme,
  context: FrameRenderContext
): void {
  const boxes = [
    { x: 0.76, y: 1.48, w: 5.72, h: 2.05 },
    { x: 6.86, y: 1.48, w: 5.72, h: 2.05 },
    { x: 0.76, y: 3.86, w: 5.72, h: 2.05 },
    { x: 6.86, y: 3.86, w: 5.72, h: 2.05 }
  ];
  blocks.forEach((block, index) => {
    renderFrameBlock(slide, block, theme, boxes[index], context);
  });
}

function renderFrameTitleBody(
  slide: PptxGenJS.Slide,
  block: FrameBlock | undefined,
  theme: RendererTheme,
  context: FrameRenderContext
): void {
  renderFrameBlock(slide, block, theme, { x: 0.82, y: 1.58, w: 11.4, h: 4.9 }, context);
}

function renderFrameBlock(
  slide: PptxGenJS.Slide,
  block: FrameBlock | undefined,
  theme: RendererTheme,
  box: { x: number; y: number; w: number; h: number },
  context: FrameRenderContext
): void {
  if (!block) return;
  if (block.visualRequest || block.styleId === "visualContain" || block.styleId === "visualCover") {
    renderFrameVisualBlock(slide, block, theme, box, context.density);
    return;
  }
  if (block.kind === "callout" || block.styleId === "callout" || block.styleId === "headlineCenter") {
    renderFrameCalloutBlock(slide, block, theme, box);
    return;
  }
  renderFrameTextBlock(slide, block, theme, box, context);
}

function renderFrameTextBlock(
  slide: PptxGenJS.Slide,
  block: FrameBlock,
  theme: RendererTheme,
  box: { x: number; y: number; w: number; h: number },
  context: FrameRenderContext
): void {
  const textScale = resolveTextScale(block.renderStyle?.fontSize) * (context.typography?.bodyScale || 1);
  const itemScale = resolveTextScale(block.renderStyle?.itemFontSize || block.renderStyle?.fontSize) * (context.typography?.itemScale || 1);
  const settings = {
    ...densitySettings(context.density),
    bulletFontSize: densitySettings(context.density).bulletFontSize * itemScale
  };
  const showHeading = block.renderStyle?.showHeading !== false;
  if (block.heading && showHeading) {
    slide.addText(block.heading, {
      x: box.x,
      y: box.y,
      w: box.w,
      h: 0.36,
      fontFace: theme.fontFace,
      fontSize: 15.2 * textScale,
      bold: true,
      color: theme.accent,
      fit: "shrink",
      margin: 0
    });
    slide.addShape("line", {
      x: box.x,
      y: box.y + 0.5,
      w: box.w,
      h: 0,
      line: { color: theme.border, width: 0.8, transparency: 20 }
    });
  }

  let contentY = box.y + (block.heading && showHeading ? 0.78 : 0.08);
  if (block.text) {
    slide.addText(block.text, {
      x: box.x,
      y: contentY,
      w: box.w,
      h: 0.56,
      fontFace: theme.fontFace,
      fontSize: 11.5 * textScale,
      color: theme.mutedText,
      fit: "shrink",
      margin: 0
    });
    contentY += 0.7;
  }
  (block.items || []).slice(0, settings.columnBulletLimit).forEach((item, index) => {
    addBullet(
      slide,
      theme,
      { text: item },
      box.x + 0.24,
      contentY + index * Math.min(settings.columnBulletGap, 0.44),
      box.w - 0.24,
      settings
    );
  });
}

function renderFrameVisualBlock(
  slide: PptxGenJS.Slide,
  block: FrameBlock,
  theme: RendererTheme,
  box: { x: number; y: number; w: number; h: number },
  density: PresentationDensity
): void {
  const visual = block.visualRequest;
  if (visual?.asset?.base64) {
    const imageBox = resolveContainedImageBox(box, resolveAssetAspectRatio(visual.asset));
    slide.addShape("rect", {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      fill: { color: theme.surface, transparency: 100 },
      line: { color: theme.border, width: 0.55, transparency: 45 }
    });
    slide.addImage({
      data: `data:${visual.asset.mimeType || "image/png"};base64,${visual.asset.base64}`,
      x: imageBox.x,
      y: imageBox.y,
      w: imageBox.w,
      h: imageBox.h
    });
    return;
  }
  if (visual?.type === "diagram") {
    renderFrameDiagramBlock(slide, block, theme, box);
    addFrameBlockIdTag(slide, block.id, theme, box);
    return;
  }
  if (visual?.type === "map") {
    renderFrameMapBlock(slide, block, theme, box);
    addFrameBlockIdTag(slide, block.id, theme, box);
    return;
  }
  if (visual?.type === "iconSet") {
    renderFrameIconSetBlock(slide, block, theme, box);
    addFrameBlockIdTag(slide, block.id, theme, box);
    return;
  }
  slide.addShape("roundRect", {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    rectRadius: 0.06,
    fill: { color: theme.accentSoft, transparency: 8 },
    line: { color: theme.accent, width: 1.1 }
  });
  slide.addText(visual?.brief || block.heading || "ビジュアル案", {
    x: box.x + 0.28,
    y: box.y + 0.26,
    w: box.w - 0.56,
    h: 0.36,
    fontFace: theme.fontFace,
    fontSize: 14,
    bold: true,
    color: theme.accent,
    fit: "shrink",
    margin: 0
  });
  const visualBody = visual?.prompt
    ? `Prompt: ${visual.prompt}`
    : visual?.promptNote
      ? `Prompt needed: ${visual.promptNote}`
      : "ビジュアル案を確認してください";
  slide.addText(visualBody, {
    x: box.x + 0.34,
    y: box.y + 0.88,
    w: box.w - 0.68,
    h: Math.max(0.72, box.h - 1.35),
    fontFace: theme.fontFace,
    fontSize: density === "dense" ? 9.8 : 10.6,
    color: theme.text,
    fit: "shrink",
    margin: 0.04,
    valign: "middle",
    align: "center"
  });
  if (visual?.labels?.length) {
    const labelY = box.y + box.h - 0.5;
    visual.labels.slice(0, 4).forEach((label, index) => {
      slide.addText(label, {
        x: box.x + 0.3 + index * ((box.w - 0.8) / 4),
        y: labelY,
        w: (box.w - 1) / 4,
        h: 0.28,
        fontFace: theme.fontFace,
        fontSize: 8.8,
        color: theme.text,
        fill: { color: theme.background, transparency: 12 },
        fit: "shrink",
        align: "center",
        margin: 0.02
      });
    });
  }
  addFrameBlockIdTag(slide, block.id, theme, box);
}

function resolveAssetAspectRatio(
  asset: NonNullable<NonNullable<FrameBlock["visualRequest"]>["asset"]>
): number | undefined {
  if (typeof asset.aspectRatio === "number" && asset.aspectRatio > 0) {
    return asset.aspectRatio;
  }
  if (
    typeof asset.widthPx === "number" &&
    asset.widthPx > 0 &&
    typeof asset.heightPx === "number" &&
    asset.heightPx > 0
  ) {
    return asset.widthPx / asset.heightPx;
  }
  return undefined;
}

function resolveContainedImageBox(
  box: { x: number; y: number; w: number; h: number },
  aspectRatio?: number
) {
  if (!aspectRatio || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return box;
  }
  const boxRatio = box.w / box.h;
  if (aspectRatio > boxRatio) {
    const h = box.w / aspectRatio;
    return {
      x: box.x,
      y: box.y + (box.h - h) / 2,
      w: box.w,
      h
    };
  }
  const w = box.h * aspectRatio;
  return {
    x: box.x + (box.w - w) / 2,
    y: box.y,
    w,
    h: box.h
  };
}

function addFrameBlockIdTag(
  slide: PptxGenJS.Slide,
  blockId: string | undefined,
  theme: RendererTheme,
  box: { x: number; y: number; w: number; h: number }
): void {
  if (!blockId) return;
  const tagW = Math.min(1.25, Math.max(0.7, box.w * 0.28));
  slide.addText(`Block ${blockId}`, {
    x: box.x + box.w - tagW - 0.12,
    y: box.y + box.h - 0.34,
    w: tagW,
    h: 0.22,
    fontFace: theme.fontFace,
    fontSize: 7.2,
    bold: true,
    color: theme.accent,
    fill: { color: theme.background, transparency: 8 },
    line: { color: theme.accent, transparency: 35 },
    fit: "shrink",
    align: "center",
    margin: 0.02
  });
}

function renderFrameDiagramBlock(
  slide: PptxGenJS.Slide,
  block: FrameBlock,
  theme: RendererTheme,
  box: { x: number; y: number; w: number; h: number }
): void {
  const visual = block.visualRequest;
  const diagramText = visual?.prompt || visual?.brief || "";
  const twoAxisLabels = extractTwoAxisLabels(diagramText, visual?.labels);
  const steps = visual?.labels?.length
    ? visual.labels
    : extractFlowSteps(diagramText);
  if (visual?.renderStyle?.showBrief !== false) {
    slide.addText(visual?.brief || "図解", {
      x: box.x,
      y: box.y,
      w: box.w,
      h: 0.32,
      fontFace: theme.fontFace,
      fontSize: 14,
      bold: true,
      color: theme.accent,
      fit: "shrink",
      margin: 0
    });
  }
  if (twoAxisLabels) {
    renderFrameTwoAxisDiagram(slide, theme, box, twoAxisLabels);
    return;
  }
  if (steps.length >= 2) {
    if (visual?.renderStyle?.orientation === "vertical") {
      renderFrameVerticalFlowDiagram(slide, theme, box, steps);
      return;
    }
    const count = Math.min(steps.length, 6);
    const gap = 0.15;
    const pillW = (box.w - gap * (count - 1)) / count;
    const y = box.y + Math.max(0.72, box.h * 0.42);
    steps.slice(0, count).forEach((step, index) => {
      slide.addShape("roundRect", {
        x: box.x + index * (pillW + gap),
        y,
        w: pillW,
        h: 0.56,
        rectRadius: 0.04,
        fill: { color: theme.accentSoft },
        line: { color: theme.accent, width: 0.8 }
      });
      slide.addText(step, {
        x: box.x + index * (pillW + gap) + 0.04,
        y: y + 0.13,
        w: pillW - 0.08,
        h: 0.22,
        fontFace: theme.fontFace,
        fontSize: 8.8,
        bold: true,
        color: theme.text,
        fit: "shrink",
        align: "center",
        margin: 0
      });
      if (index < count - 1) {
        slide.addText("→", {
          x: box.x + (index + 1) * pillW + index * gap - 0.04,
          y: y + 0.18,
          w: gap + 0.08,
          h: 0.2,
          fontFace: theme.fontFace,
          fontSize: 11,
          color: theme.accent,
          align: "center",
          margin: 0
        });
      }
    });
    return;
  }
  renderPromptFallback(slide, theme, visual?.prompt || visual?.promptNote || visual?.brief || "", box);
}

function renderFrameVerticalFlowDiagram(
  slide: PptxGenJS.Slide,
  theme: RendererTheme,
  box: { x: number; y: number; w: number; h: number },
  steps: string[]
): void {
  const count = Math.min(steps.length, 7);
  const startY = box.y + 0.55;
  const availableH = Math.max(1.2, box.h - 0.75);
  const rowH = Math.min(0.48, availableH / count - 0.08);
  const gap = Math.max(0.05, (availableH - rowH * count) / Math.max(1, count - 1));
  const pillW = Math.min(box.w - 0.25, 2.35);
  const x = box.x + box.w / 2 - pillW / 2;
  steps.slice(0, count).forEach((step, index) => {
    const y = startY + index * (rowH + gap);
    slide.addShape("roundRect", {
      x,
      y,
      w: pillW,
      h: rowH,
      rectRadius: 0.04,
      fill: { color: theme.accentSoft },
      line: { color: theme.accent, width: 0.8 }
    });
    slide.addText(step, {
      x: x + 0.08,
      y: y + rowH * 0.25,
      w: pillW - 0.16,
      h: rowH * 0.38,
      fontFace: theme.fontFace,
      fontSize: 8.8,
      bold: true,
      color: theme.text,
      fit: "shrink",
      align: "center",
      margin: 0
    });
    if (index < count - 1) {
      slide.addText("↓", {
        x: box.x + box.w / 2 - 0.12,
        y: y + rowH + gap * 0.18,
        w: 0.24,
        h: Math.max(0.12, gap * 0.64),
        fontFace: theme.fontFace,
        fontSize: 10,
        color: theme.accent,
        fit: "shrink",
        align: "center",
        margin: 0
      });
    }
  });
}

function renderFrameTwoAxisDiagram(
  slide: PptxGenJS.Slide,
  theme: RendererTheme,
  box: { x: number; y: number; w: number; h: number },
  labels: [string, string]
): void {
  const contentY = box.y + Math.max(0.7, box.h * 0.28);
  const axisW = Math.min(1.85, (box.w - 1.2) / 2);
  const axisH = 0.82;
  const leftX = box.x + Math.max(0.2, box.w * 0.08);
  const rightX = box.x + box.w - axisW - Math.max(0.2, box.w * 0.08);
  const centerX = box.x + box.w / 2 - 0.56;
  const centerY = contentY + 1.15;
  [
    { label: labels[0], x: leftX },
    { label: labels[1], x: rightX }
  ].forEach((item) => {
    slide.addShape("roundRect", {
      x: item.x,
      y: contentY,
      w: axisW,
      h: axisH,
      rectRadius: 0.06,
      fill: { color: theme.accentSoft },
      line: { color: theme.accent, width: 1.1 }
    });
    slide.addText(item.label, {
      x: item.x + 0.08,
      y: contentY + 0.22,
      w: axisW - 0.16,
      h: 0.3,
      fontFace: theme.fontFace,
      fontSize: 10.2,
      bold: true,
      color: theme.text,
      fit: "shrink",
      align: "center",
      margin: 0
    });
  });
  slide.addText("×", {
    x: box.x + box.w / 2 - 0.14,
    y: contentY + 0.25,
    w: 0.28,
    h: 0.24,
    fontFace: theme.fontFace,
    fontSize: 14,
    bold: true,
    color: theme.accent,
    align: "center",
    margin: 0
  });
  slide.addText("連携", {
    x: centerX,
    y: centerY,
    w: 1.12,
    h: 0.34,
    fontFace: theme.fontFace,
    fontSize: 11.5,
    bold: true,
    color: theme.accent,
    fit: "shrink",
    align: "center",
    margin: 0
  });
  slide.addShape("line", {
    x: leftX + axisW / 2,
    y: contentY + axisH,
    w: centerX + 0.56 - (leftX + axisW / 2),
    h: centerY - (contentY + axisH),
    line: { color: theme.accent, width: 1.1, beginArrowType: "none", endArrowType: "triangle" }
  });
  slide.addShape("line", {
    x: rightX + axisW / 2,
    y: contentY + axisH,
    w: centerX + 0.56 - (rightX + axisW / 2),
    h: centerY - (contentY + axisH),
    line: { color: theme.accent, width: 1.1, beginArrowType: "none", endArrowType: "triangle" }
  });
  slide.addShape("line", {
    x: centerX + 0.56,
    y: centerY + 0.44,
    w: 0,
    h: 0.76,
    line: { color: theme.accent, width: 1.1, beginArrowType: "none", endArrowType: "triangle" }
  });
  slide.addText("持続可能性向上", {
    x: box.x + box.w / 2 - 1.2,
    y: centerY + 1.1,
    w: 2.4,
    h: 0.36,
    fontFace: theme.fontFace,
    fontSize: 11.2,
    bold: true,
    color: theme.text,
    fill: { color: theme.background, transparency: 0 },
    fit: "shrink",
    align: "center",
    margin: 0.02
  });
}

function renderFrameMapBlock(
  slide: PptxGenJS.Slide,
  block: FrameBlock,
  theme: RendererTheme,
  box: { x: number; y: number; w: number; h: number }
): void {
  const visual = block.visualRequest;
  const labels = visual?.labels?.length ? visual.labels : extractMapLabels(visual?.prompt || "");
  slide.addText(visual?.brief || "地図", {
    x: box.x,
    y: box.y,
    w: box.w,
    h: 0.32,
    fontFace: theme.fontFace,
    fontSize: 14,
    bold: true,
    color: theme.accent,
    fit: "shrink",
    margin: 0
  });
  slide.addShape("roundRect", {
    x: box.x,
    y: box.y + 0.58,
    w: box.w,
    h: Math.max(1.2, box.h - 0.85),
    rectRadius: 0.06,
    fill: { color: theme.accentSoft, transparency: 10 },
    line: { color: theme.accent, width: 0.9 }
  });
  const positions = [
    { x: 0.58, y: 0.5 },
    { x: 0.7, y: 0.36 },
    { x: 0.22, y: 0.42 },
    { x: 0.48, y: 0.72 }
  ];
  labels.slice(0, 4).forEach((label, index) => {
    const pos = positions[index];
    slide.addText(label, {
      x: box.x + box.w * pos.x - 0.42,
      y: box.y + 0.58 + (box.h - 0.85) * pos.y - 0.14,
      w: 0.9,
      h: 0.26,
      fontFace: theme.fontFace,
      fontSize: 8.8,
      bold: true,
      color: theme.text,
      fill: { color: theme.background, transparency: 6 },
      fit: "shrink",
      align: "center",
      margin: 0.02
    });
  });
}

function renderFrameIconSetBlock(
  slide: PptxGenJS.Slide,
  block: FrameBlock,
  theme: RendererTheme,
  box: { x: number; y: number; w: number; h: number }
): void {
  const visual = block.visualRequest;
  const labels = visual?.labels?.length ? visual.labels : extractFlowSteps(visual?.prompt || visual?.brief || "");
  slide.addText(visual?.brief || "アイコンセット", {
    x: box.x,
    y: box.y,
    w: box.w,
    h: 0.32,
    fontFace: theme.fontFace,
    fontSize: 14,
    bold: true,
    color: theme.accent,
    fit: "shrink",
    margin: 0
  });
  const count = Math.max(1, Math.min(labels.length || 4, 4));
  const gap = 0.18;
  const itemW = (box.w - gap * (count - 1)) / count;
  labels.slice(0, count).forEach((label, index) => {
    const x = box.x + index * (itemW + gap);
    slide.addShape("ellipse", {
      x: x + itemW / 2 - 0.24,
      y: box.y + 0.78,
      w: 0.48,
      h: 0.48,
      fill: { color: theme.accentSoft },
      line: { color: theme.accent, width: 1 }
    });
    slide.addText(label, {
      x,
      y: box.y + 1.38,
      w: itemW,
      h: 0.34,
      fontFace: theme.fontFace,
      fontSize: 8.8,
      color: theme.text,
      fit: "shrink",
      align: "center",
      margin: 0
    });
  });
}

function renderPromptFallback(
  slide: PptxGenJS.Slide,
  theme: RendererTheme,
  text: string,
  box: { x: number; y: number; w: number; h: number }
): void {
  slide.addText(text, {
    x: box.x + 0.16,
    y: box.y + 0.56,
    w: box.w - 0.32,
    h: Math.max(0.65, box.h - 0.7),
    fontFace: theme.fontFace,
    fontSize: 10.2,
    color: theme.text,
    fit: "shrink",
    margin: 0.02,
    valign: "middle",
    align: "center"
  });
}

function renderFrameCalloutBlock(
  slide: PptxGenJS.Slide,
  block: FrameBlock,
  theme: RendererTheme,
  box: { x: number; y: number; w: number; h: number }
): void {
  const text = blockDisplayText(block);
  slide.addText(text, {
    x: box.x,
    y: box.y + Math.max(0, box.h * 0.18),
    w: box.w,
    h: Math.min(0.78, box.h),
    fontFace: theme.fontFace,
    fontSize: box.w > 8 ? 22 : 16,
    bold: true,
    color: theme.text,
    fit: "shrink",
    margin: 0
  });
  slide.addShape("line", {
    x: box.x,
    y: box.y + box.h - 0.12,
    w: box.w,
    h: 0,
    line: { color: theme.accent, width: 1.2 }
  });
}

function blockDisplayText(block: FrameBlock | undefined) {
  if (!block) return "";
  return block.text || block.heading || block.items?.[0] || block.visualRequest?.brief || "";
}

function isRedundantFrameText(title: string, text: string) {
  const titleKey = normalizeSemanticText(title);
  const textKey = normalizeSemanticText(text);
  if (!titleKey || !textKey) return false;
  if (titleKey === textKey || titleKey.includes(textKey) || textKey.includes(titleKey)) {
    return true;
  }
  const markers = ["環境", "社会", "課題", "リスク", "サステナビリティ", "生産", "工程"];
  const titleHits = markers.filter((marker) => title.includes(marker));
  const textHits = markers.filter((marker) => text.includes(marker));
  return titleHits.filter((marker) => textHits.includes(marker)).length >= 3;
}

function normalizeSemanticText(value: string) {
  return value
    .replace(/[・、。:：\s]/g, "")
    .replace(/に伴う|について|における|及び|および|の|と/g, "")
    .trim();
}

function resolveTextScale(value: "small" | "standard" | "large" | "xlarge" | undefined) {
  if (value === "small") return 0.9;
  if (value === "large") return 1.18;
  if (value === "xlarge") return 1.34;
  return 1;
}

export function extractFlowSteps(value: string) {
  const flowText = isolateArrowFlowText(value);
  const arrowParts = flowText
    .split(/(?:->|→|＞|>)/u)
    .map(cleanFlowStep)
    .filter(Boolean);
  if (arrowParts.length >= 2) return arrowParts.slice(0, 8);
  return value
    .split(/[、,・]/u)
    .map(cleanFlowStep)
    .filter((item) => !/^(順番は|各段階に|簡単な説明ラベル付き|の流れ図|図解|フロー図)/u.test(item))
    .filter((item) => item.length >= 2 && item.length <= 16)
    .slice(0, 8);
}

function isolateArrowFlowText(value: string) {
  const firstArrowIndex = value.search(/(?:->|→|＞|>)/u);
  if (firstArrowIndex < 0) return value;

  const beforeArrow = value.slice(0, firstArrowIndex);
  const lastSentenceBreak = Math.max(
    beforeArrow.lastIndexOf("。"),
    beforeArrow.lastIndexOf("．"),
    beforeArrow.lastIndexOf("."),
    beforeArrow.lastIndexOf("："),
    beforeArrow.lastIndexOf(":")
  );
  return lastSentenceBreak >= 0 ? value.slice(lastSentenceBreak + 1) : value;
}

function cleanFlowStep(value: string) {
  return value
    .replace(/（.*?）/g, "")
    .replace(/\(.*?\)/g, "")
    .split(/[。．.]/u)[0]
    .replace(/^(順番は|各段階に|簡単な説明ラベル付き|の流れ図)/u, "")
    .replace(/各工程.*$/u, "")
    .replace(/各段階.*$/u, "")
    .trim();
}

export function extractTwoAxisLabels(value: string, labels?: string[]): [string, string] | null {
  if (labels?.length === 2 && /(?:2|二)軸/u.test(value)) {
    return [cleanDiagramLabel(labels[0]), cleanDiagramLabel(labels[1])];
  }
  const normalized = value.replace(/\s+/g, "");
  const match = normalized.match(/([^。．.、,]+?)と([^。．.、,]+?)の(?:2|二)軸/u);
  if (!match) return null;
  const first = cleanDiagramLabel(match[1]);
  const second = cleanDiagramLabel(match[2]);
  if (!first || !second) return null;
  return [first, second];
}

function cleanDiagramLabel(value: string) {
  return value
    .replace(/^(図解|イラスト|概念図|矢印で|連携を表現し)/u, "")
    .replace(/を示す$/u, "")
    .trim();
}

function extractMapLabels(value: string) {
  const known = ["インド", "中国", "アメリカ", "ブラジル", "米国", "中央アジア", "日本"];
  const labels = known.filter((label) => value.includes(label));
  return labels.length > 0 ? labels : extractFlowSteps(value).slice(0, 4);
}

function renderTitleSlide(
  slide: PptxGenJS.Slide,
  slideSpec: Extract<SlideSpec, { type: "title" }>,
  theme: RendererTheme
): void {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: layout.width,
    h: layout.height,
    fill: { color: theme.background },
    line: { color: theme.background }
  });
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: 0.18,
    h: layout.height,
    fill: { color: theme.accent },
    line: { color: theme.accent }
  });

  if (slideSpec.kicker) {
    slide.addText(slideSpec.kicker, {
      x: 0.78,
      y: 1.05,
      w: 6.5,
      h: 0.35,
      fontFace: theme.fontFace,
      fontSize: 13,
      bold: true,
      color: theme.accent,
      margin: 0
    });
  }

  const hasKeyVisual = !!slideSpec.keyVisual;
  slide.addText(slideSpec.title, {
    x: 0.76,
    y: hasKeyVisual ? 0.88 : 1.62,
    w: 10.4,
    h: 1.25,
    fontFace: theme.fontFace,
    fontSize: 36,
    bold: true,
    fit: "shrink",
    color: theme.text,
    margin: 0
  });

  if (slideSpec.keyVisual) {
    slide.addShape("roundRect", {
      x: 1.12,
      y: 2.38,
      w: 11.1,
      h: 2.38,
      rectRadius: 0.06,
      fill: { color: theme.accentSoft },
      line: { color: theme.accent, width: 1.2 }
    });
    slide.addText(slideSpec.keyVisual, {
      x: 1.42,
      y: 3.02,
      w: 10.5,
      h: 0.86,
      fontFace: theme.fontFace,
      fontSize: 18,
      bold: true,
      color: theme.text,
      fit: "shrink",
      margin: 0.04,
      valign: "middle",
      align: "center"
    });
  }

  if (slideSpec.subtitle) {
    slide.addText(slideSpec.subtitle, {
      x: 0.78,
      y: hasKeyVisual ? 5.18 : 3.08,
      w: 9.2,
      h: 0.7,
      fontFace: theme.fontFace,
      fontSize: 18,
      color: theme.mutedText,
      fit: "shrink",
      margin: 0
    });
  }

  const meta = [slideSpec.presenter, slideSpec.date].filter(Boolean).join(" / ");
  if (meta) {
    slide.addText(meta, {
      x: 0.78,
      y: 6.35,
      w: 6.8,
      h: 0.28,
      fontFace: theme.fontFace,
      fontSize: 11,
      color: theme.mutedText,
      margin: 0
    });
  }
}

function renderSectionSlide(
  slide: PptxGenJS.Slide,
  slideSpec: Extract<SlideSpec, { type: "section" }>,
  theme: RendererTheme
): void {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: layout.width,
    h: layout.height,
    fill: { color: theme.accent },
    line: { color: theme.accent }
  });

  if (slideSpec.sectionNumber) {
    slide.addText(slideSpec.sectionNumber, {
      x: 0.72,
      y: 0.82,
      w: 2.2,
      h: 0.55,
      fontFace: theme.fontFace,
      fontSize: 18,
      bold: true,
      color: theme.inverseText,
      margin: 0
    });
  }

  slide.addText(slideSpec.title, {
    x: 0.72,
    y: 2.52,
    w: 10.8,
    h: 0.95,
    fontFace: theme.fontFace,
    fontSize: 34,
    bold: true,
    fit: "shrink",
    color: theme.inverseText,
    margin: 0
  });

  if (slideSpec.subtitle) {
    slide.addText(slideSpec.subtitle, {
      x: 0.74,
      y: 3.68,
      w: 9.4,
      h: 0.52,
      fontFace: theme.fontFace,
      fontSize: 16,
      color: theme.inverseText,
      transparency: 12,
      fit: "shrink",
      margin: 0
    });
  }
}

function renderBulletsSlide(
  slide: PptxGenJS.Slide,
  slideSpec: Extract<SlideSpec, { type: "bullets" }>,
  theme: RendererTheme,
  density: PresentationDensity
): void {
  addSlideTitle(slide, theme, slideSpec.title, slideSpec.lead);

  const startY = slideSpec.lead ? 2.0 : 1.62;
  const settings = densitySettings(density);
  slideSpec.bullets.slice(0, settings.bulletLimit).forEach((bullet, index) => {
    addBullet(
      slide,
      theme,
      bullet,
      0.98,
      startY + index * settings.bulletGap,
      10.7,
      settings
    );
  });

  addTakeaway(slide, theme, slideSpec.takeaway);
}

function renderTwoColumnSlide(
  slide: PptxGenJS.Slide,
  slideSpec: Extract<SlideSpec, { type: "twoColumn" }>,
  theme: RendererTheme,
  density: PresentationDensity
): void {
  addSlideTitle(slide, theme, slideSpec.title, slideSpec.lead);

  const y = slideSpec.lead ? 2.12 : 1.74;
  const leftColumn = resolveColumn(slideSpec, "left");
  const rightColumn = resolveColumn(slideSpec, "right");
  if (slideSpec.layoutVariant === "visualHero") {
    addVisualHero(slide, theme, leftColumn, rightColumn, y, density);
    addTakeaway(slide, theme, slideSpec.takeaway);
    return;
  }
  addColumn(slide, theme, leftColumn, 0.76, y, 5.65, density);
  addColumn(slide, theme, rightColumn, 6.92, y, 5.65, density);
  addTakeaway(slide, theme, slideSpec.takeaway);
}

function renderTableSlide(
  slide: PptxGenJS.Slide,
  slideSpec: Extract<SlideSpec, { type: "table" }>,
  theme: RendererTheme
): void {
  addSlideTitle(slide, theme, slideSpec.title, slideSpec.lead);

  const y = slideSpec.lead ? 1.85 : 1.48;
  const rows = [
    slideSpec.columns.map((column) => ({
      text: column,
      options: { bold: true, color: theme.inverseText, fill: { color: theme.accent } }
    })),
    ...slideSpec.rows.map((row) =>
      row.map((cell) => ({
        text: cell,
        options: { color: theme.text, fill: { color: theme.surface } }
      }))
    )
  ];

  slide.addTable(rows, {
    x: 0.72,
    y,
    w: 11.9,
    h: Math.min(4.55, 0.46 + rows.length * 0.48),
    border: { color: theme.border, pt: 1 },
    fontFace: theme.fontFace,
    fontSize: 9.5,
    margin: 0.08,
    valign: "middle"
  });

  addTakeaway(slide, theme, slideSpec.takeaway);
}

function renderCardsSlide(
  slide: PptxGenJS.Slide,
  slideSpec: Extract<SlideSpec, { type: "cards" }>,
  theme: RendererTheme,
  density: PresentationDensity
): void {
  addSlideTitle(slide, theme, slideSpec.title, slideSpec.lead);

  const y = slideSpec.lead ? 1.86 : 1.5;
  const cards = slideSpec.cards;
  if (slideSpec.layoutVariant === "heroTopDetailsBottom" && cards.length >= 3) {
    addHeroCallout(slide, theme, cards[0], { x: 0.76, y, w: 11.8, h: 1.25 });
    addCard(slide, theme, cards[1], { x: 0.76, y: y + 1.9, w: 5.7, h: 2.55 }, density, 4);
    addCard(slide, theme, cards[2], { x: 6.86, y: y + 1.9, w: 5.7, h: 2.55 }, density, 4);
    addTakeaway(slide, theme, slideSpec.takeaway);
    return;
  }
  const isGrid = slideSpec.layoutVariant === "twoByTwoGrid" || cards.length === 4;
  if (isGrid) {
    const positions = [
      { x: 0.76, y, w: 5.7, h: 2.05 },
      { x: 6.86, y, w: 5.7, h: 2.05 },
      { x: 0.76, y: y + 2.34, w: 5.7, h: 2.05 },
      { x: 6.86, y: y + 2.34, w: 5.7, h: 2.05 }
    ];
    cards.slice(0, 4).forEach((card, index) => {
      addCard(slide, theme, card, positions[index], density, 3);
    });
    addTakeaway(slide, theme, slideSpec.takeaway);
    return;
  }

  const gap = 0.28;
  const count = Math.min(cards.length, 3);
  const cardW = (11.82 - gap * (count - 1)) / count;
  cards.slice(0, 3).forEach((card, index) => {
    addCard(
      slide,
      theme,
      card,
      { x: 0.76 + index * (cardW + gap), y, w: cardW, h: 4.4 },
      density,
      5
    );
  });
  addTakeaway(slide, theme, slideSpec.takeaway);
}

function addHeroCallout(
  slide: PptxGenJS.Slide,
  theme: RendererTheme,
  card: CardContent,
  box: { x: number; y: number; w: number; h: number }
): void {
  slide.addShape("rect", {
    x: box.x,
    y: box.y + box.h - 0.08,
    w: box.w,
    h: 0,
    line: { color: theme.accent, width: 1.2 }
  });
  slide.addText(card.body || card.title, {
    x: box.x,
    y: box.y + 0.18,
    w: box.w,
    h: 0.52,
    fontFace: theme.fontFace,
    fontSize: 20,
    bold: true,
    color: theme.text,
    fit: "shrink",
    margin: 0
  });
}

function renderClosingSlide(
  slide: PptxGenJS.Slide,
  slideSpec: Extract<SlideSpec, { type: "closing" }>,
  theme: RendererTheme
): void {
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: layout.width,
    h: 1.0,
    fill: { color: theme.accent },
    line: { color: theme.accent }
  });
  slide.addText(slideSpec.title, {
    x: 0.74,
    y: 1.42,
    w: 10.5,
    h: 0.68,
    fontFace: theme.fontFace,
    fontSize: 30,
    bold: true,
    fit: "shrink",
    color: theme.text,
    margin: 0
  });

  if (slideSpec.message) {
    slide.addText(slideSpec.message, {
      x: 0.78,
      y: 2.42,
      w: 9.6,
      h: 0.72,
      fontFace: theme.fontFace,
      fontSize: 17,
      color: theme.mutedText,
      fit: "shrink",
      margin: 0
    });
  }

  slideSpec.nextSteps?.slice(0, 5).forEach((step, index) => {
    addBullet(
      slide,
      theme,
      { text: step, emphasis: index === 0 ? "strong" : "normal" },
      0.98,
      3.55 + index * 0.55,
      10.8
    );
  });

  if (slideSpec.contact) {
    slide.addText(slideSpec.contact, {
      x: 0.78,
      y: 6.42,
      w: 5.5,
      h: 0.32,
      fontFace: theme.fontFace,
      fontSize: 11,
      color: theme.mutedText,
      margin: 0
    });
  }
}

function addSlideTitle(
  slide: PptxGenJS.Slide,
  theme: RendererTheme,
  title: string,
  lead?: string
): void {
  slide.addText(title, {
    x: layout.marginX,
    y: layout.topY,
    w: 10.8,
    h: 0.48,
    fontFace: theme.fontFace,
    fontSize: 24,
    bold: true,
    fit: "shrink",
    color: theme.text,
    margin: 0
  });
  slide.addShape("line", {
    x: layout.marginX,
    y: 1.13,
    w: 11.9,
    h: 0,
    line: { color: theme.accent, width: 1.5 }
  });

  if (lead) {
    slide.addText(lead, {
      x: layout.marginX,
      y: 1.28,
      w: 11.35,
      h: 0.44,
      fontFace: theme.fontFace,
      fontSize: 12.5,
      color: theme.mutedText,
      fit: "shrink",
      margin: 0
    });
  }
}

function addBullet(
  slide: PptxGenJS.Slide,
  theme: RendererTheme,
  bullet: BulletItem,
  x: number,
  y: number,
  w: number,
  settings: ReturnType<typeof densitySettings> = densitySettings("standard")
): void {
  const color =
    bullet.emphasis === "muted"
      ? theme.mutedText
      : bullet.emphasis === "strong"
        ? theme.accent
        : theme.text;

  slide.addShape("ellipse", {
    x: x - 0.24,
    y: y + 0.08,
    w: 0.1,
    h: 0.1,
    fill: { color: theme.accent },
    line: { color: theme.accent }
  });
  slide.addText(bullet.text, {
    x,
    y,
    w,
    h: settings.bulletTextHeight,
    fontFace: theme.fontFace,
    fontSize: settings.bulletFontSize,
    bold: bullet.emphasis === "strong",
    color,
    fit: "shrink",
    margin: 0
  });

  if (bullet.detail) {
    slide.addText(bullet.detail, {
      x,
      y: y + 0.3,
      w,
      h: 0.24,
      fontFace: theme.fontFace,
      fontSize: 10.5,
      color: theme.mutedText,
      fit: "shrink",
      margin: 0
    });
  }
}

function addVisualHero(
  slide: PptxGenJS.Slide,
  theme: RendererTheme,
  visualColumn: ColumnContent,
  textColumn: ColumnContent,
  y: number,
  density: PresentationDensity
): void {
  const settings = densitySettings(density);
  slide.addShape("roundRect", {
    x: 0.82,
    y,
    w: 11.72,
    h: 2.45,
    rectRadius: 0.05,
    fill: { color: theme.accentSoft },
    line: { color: theme.accent, width: 1.2 }
  });
  slide.addText(visualColumn.heading, {
    x: 1.08,
    y: y + 0.22,
    w: 11.2,
    h: 0.3,
    fontFace: theme.fontFace,
    fontSize: 14,
    bold: true,
    color: theme.accent,
    fit: "shrink",
    margin: 0
  });
  slide.addText(visualColumn.body || "ビジュアル案を確認してください", {
    x: 1.18,
    y: y + 0.68,
    w: 10.98,
    h: visualColumn.bullets?.length ? 0.66 : 1.12,
    fontFace: theme.fontFace,
    fontSize: 18,
    bold: true,
    color: theme.text,
    fit: "shrink",
    margin: 0.04,
    valign: "middle",
    align: "center"
  });
  visualColumn.bullets?.slice(0, 4).forEach((bullet, index) => {
    slide.addText(bullet.text, {
      x: 1.16 + index * 2.76,
      y: y + 1.68,
      w: 2.42,
      h: 0.36,
      fontFace: theme.fontFace,
      fontSize: 9.8,
      bold: bullet.emphasis === "strong",
      color: theme.text,
      fill: { color: theme.surface, transparency: 5 },
      fit: "shrink",
      margin: 0.04,
      valign: "middle",
      align: "center"
    });
  });

  const textY = y + 2.78;
  slide.addShape("roundRect", {
    x: 0.82,
    y: textY,
    w: 11.72,
    h: 1.42,
    rectRadius: 0.04,
    fill: { color: theme.surface },
    line: { color: theme.border, width: 1 }
  });
  slide.addText(textColumn.body || textColumn.heading, {
    x: 1.08,
    y: textY + 0.18,
    w: 11.1,
    h: 0.34,
    fontFace: theme.fontFace,
    fontSize: 12.6,
    bold: true,
    color: theme.text,
    fit: "shrink",
    margin: 0
  });
  textColumn.bullets?.slice(0, 3).forEach((bullet, index) => {
    addBullet(
      slide,
      theme,
      bullet,
      1.18 + index * 3.75,
      textY + 0.74,
      3.25,
      settings
    );
  });
}

function addColumn(
  slide: PptxGenJS.Slide,
  theme: RendererTheme,
  column: ColumnContent,
  x: number,
  y: number,
  w: number,
  density: PresentationDensity = "standard"
): void {
  const settings = densitySettings(density);
  const isVisualColumn = isVisualContent(column);
  if (isVisualColumn) {
    slide.addShape("roundRect", {
      x,
      y,
      w,
      h: 3.75,
      rectRadius: 0.06,
      fill: { color: theme.accentSoft, transparency: 8 },
      line: { color: theme.accent, width: 1.1 }
    });
  } else {
    slide.addShape("line", {
      x,
      y: y + 0.58,
      w,
      h: 0,
      line: { color: theme.border, width: 0.8, transparency: 25 }
    });
  }
  slide.addText(column.heading, {
    x: x + (isVisualColumn ? 0.28 : 0),
    y: y + 0.25,
    w: w - (isVisualColumn ? 0.55 : 0),
    h: 0.36,
    fontFace: theme.fontFace,
    fontSize: 16,
    bold: true,
    color: theme.accent,
    fit: "shrink",
    margin: 0
  });

  let contentY = y + 0.82;
  if (isVisualColumn) {
    slide.addShape("roundRect", {
      x: x + 0.28,
      y: contentY,
      w: w - 0.55,
      h: 1.55,
      rectRadius: 0.04,
      fill: { color: theme.accentSoft },
      line: { color: theme.accent, width: 1 }
    });
    slide.addText(column.body || `ビジュアル案: ${column.heading}`, {
      x: x + 0.48,
      y: contentY + 0.2,
      w: w - 0.95,
      h: 1.04,
      fontFace: theme.fontFace,
      fontSize: 12.4,
      bold: true,
      color: theme.text,
      fit: "shrink",
      margin: 0.04,
      breakLine: false,
      valign: "middle",
      align: "center"
    });
    contentY += 1.8;
  } else if (column.body) {
    slide.addText(column.body, {
      x,
      y: contentY,
      w,
      h: 0.62,
      fontFace: theme.fontFace,
      fontSize: 11.5,
      color: theme.mutedText,
      fit: "shrink",
      margin: 0
    });
    contentY += 0.72;
  }

  column.bullets?.slice(0, settings.columnBulletLimit).forEach((bullet, index) => {
    addBullet(
      slide,
      theme,
      bullet,
      x + (isVisualColumn ? 0.5 : 0.24),
      contentY + index * settings.columnBulletGap,
      w - (isVisualColumn ? 0.75 : 0.24),
      settings
    );
  });
}

function addCard(
  slide: PptxGenJS.Slide,
  theme: RendererTheme,
  card: CardContent,
  box: { x: number; y: number; w: number; h: number },
  density: PresentationDensity,
  bulletLimit: number
): void {
  const settings = densitySettings(density);
  const isVisual = card.kind === "visual" || isVisualContent({
    heading: card.title,
    body: card.body,
    bullets: card.bullets
  });
  const fill = isVisual
    ? theme.accentSoft
    : card.kind === "callout"
      ? theme.accentSoft
      : theme.background;
  const line = isVisual || card.kind === "callout" ? theme.accent : theme.border;

  slide.addShape("roundRect", {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    rectRadius: 0.06,
    fill: { color: fill, transparency: isVisual || card.kind === "callout" ? 0 : 100 },
    line: {
      color: line,
      width: isVisual || card.kind === "callout" ? 1.2 : 0.8,
      transparency: isVisual || card.kind === "callout" ? 0 : 35
    }
  });
  slide.addText(card.title, {
    x: box.x + 0.22,
    y: box.y + 0.2,
    w: box.w - 0.44,
    h: 0.34,
    fontFace: theme.fontFace,
    fontSize: 13.2,
    bold: true,
    color: theme.accent,
    fit: "shrink",
    margin: 0
  });

  let contentY = box.y + 0.7;
  if (card.body) {
    slide.addText(card.body, {
      x: box.x + 0.24,
      y: contentY,
      w: box.w - 0.48,
      h: isVisual ? 0.72 : 0.42,
      fontFace: theme.fontFace,
      fontSize: isVisual ? 12.4 : 10.8,
      bold: isVisual,
      color: theme.text,
      fit: "shrink",
      margin: 0.02,
      valign: isVisual ? "middle" : "top",
      align: isVisual ? "center" : "left"
    });
    contentY += isVisual ? 0.9 : 0.52;
  }

  card.bullets?.slice(0, bulletLimit).forEach((bullet, index) => {
    addBullet(
      slide,
      theme,
      bullet,
      box.x + 0.46,
      contentY + index * Math.min(settings.columnBulletGap, 0.38),
      box.w - 0.7,
      {
        ...settings,
        bulletFontSize: Math.min(settings.bulletFontSize, 10.8),
        bulletTextHeight: 0.24
      }
    );
  });
}

function isVisualContent(column: ColumnContent): boolean {
  const probe = [
    column.heading,
    column.body || "",
    ...(column.bullets || []).map((bullet) => bullet.text)
  ].join(" ");
  return /ビジュアル|写真|画像|図|地図|マップ|アイコン|visual|photo|image|diagram|chart|map|prompt:/i.test(probe);
}

function densitySettings(density: PresentationDensity) {
  if (density === "concise") {
    return {
      bulletLimit: 5,
      columnBulletLimit: 4,
      bulletGap: 0.7,
      columnBulletGap: 0.55,
      bulletFontSize: 14.5,
      bulletTextHeight: 0.32
    };
  }
  if (density === "detailed") {
    return {
      bulletLimit: 8,
      columnBulletLimit: 6,
      bulletGap: 0.53,
      columnBulletGap: 0.42,
      bulletFontSize: 12.4,
      bulletTextHeight: 0.28
    };
  }
  if (density === "dense") {
    return {
      bulletLimit: 9,
      columnBulletLimit: 7,
      bulletGap: 0.46,
      columnBulletGap: 0.36,
      bulletFontSize: 11,
      bulletTextHeight: 0.25
    };
  }
  return {
    bulletLimit: 8,
    columnBulletLimit: 7,
    bulletGap: 0.62,
    columnBulletGap: 0.48,
    bulletFontSize: 14,
    bulletTextHeight: 0.3
  };
}

function resolveColumn(
  slideSpec: Extract<SlideSpec, { type: "twoColumn" }>,
  side: "left" | "right"
): ColumnContent {
  const primary = slideSpec[side];
  const alternate = getAlternateColumn(slideSpec, side);
  if (isPlaceholderColumn(primary) && alternate) {
    return normalizeAlternateColumn(primary, alternate, side);
  }
  if (hasColumnBody(primary)) {
    return primary;
  }
  if (!alternate || typeof alternate !== "object") {
    return primary;
  }
  return normalizeAlternateColumn(primary, alternate, side);
}

function getAlternateColumn(
  slideSpec: Extract<SlideSpec, { type: "twoColumn" }>,
  side: "left" | "right"
): Partial<ColumnContent> | undefined {
  const slideRecord = slideSpec as unknown as Record<string, unknown>;
  const direct = slideRecord[`${side}Content`] as Partial<ColumnContent> | undefined;
  if (direct && typeof direct === "object") return direct;

  const content = slideRecord.content as Record<string, unknown> | undefined;
  if (!content || typeof content !== "object") return undefined;
  const nested = content[`${side}Column`] as Record<string, unknown> | undefined;
  if (nested && typeof nested === "object") {
    return {
      heading: String(nested.heading || nested.title || nested.name || ""),
      body: typeof nested.body === "string" ? nested.body : typeof nested.text === "string" ? nested.text : undefined,
      bullets: normalizeBulletItems(nested.bullets || nested.items || nested.points)
    };
  }
  return {
    heading: String(content[`${side}Title`] || ""),
    body:
      typeof content[`${side}Body`] === "string"
        ? String(content[`${side}Body`])
        : typeof content[`${side}Text`] === "string"
          ? String(content[`${side}Text`])
          : undefined,
    bullets: normalizeBulletItems(
      content[`${side}Bullets`] || content[`${side}Items`] || content[`${side}Points`]
    )
  };
}

function normalizeAlternateColumn(
  primary: ColumnContent,
  alternate: Partial<ColumnContent>,
  side: "left" | "right"
): ColumnContent {
  const primaryIsPlaceholder = isPlaceholderColumn(primary);
  return {
    ...alternate,
    heading:
      (primaryIsPlaceholder ? alternate.heading : primary.heading) ||
      alternate.heading ||
      (side === "left" ? "Left" : "Right"),
    body: primaryIsPlaceholder ? alternate.body : primary.body || alternate.body,
    bullets:
      primaryIsPlaceholder || !primary.bullets?.length
        ? alternate.bullets
        : primary.bullets
  } as ColumnContent;
}

function hasColumnBody(column: ColumnContent): boolean {
  return !!column.body || !!column.bullets?.length;
}

function isPlaceholderColumn(column: ColumnContent): boolean {
  return (
    column.bullets?.length === 1 &&
    column.bullets[0]?.text?.toLowerCase() === "content to be refined"
  );
}

function normalizeBulletItems(value: unknown): BulletItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") {
        return { text: String(item).trim() };
      }
      if (item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string") {
        return item as BulletItem;
      }
      return null;
    })
    .filter((item): item is BulletItem => !!item && item.text.length > 0);
}

function addTakeaway(
  slide: PptxGenJS.Slide,
  theme: RendererTheme,
  takeaway?: string
): void {
  if (!takeaway) {
    return;
  }
  slide.addShape("rect", {
    x: 0.72,
    y: 6.26,
    w: 11.9,
    h: 0.5,
    fill: { color: theme.accentSoft },
    line: { color: theme.accentSoft }
  });
  slide.addText(takeaway, {
    x: 0.92,
    y: 6.38,
    w: 11.45,
    h: 0.24,
    fontFace: theme.fontFace,
    fontSize: 11.5,
    bold: true,
    color: theme.text,
    fit: "shrink",
    margin: 0
  });
}

function addFooter(
  slide: PptxGenJS.Slide,
  theme: RendererTheme,
  slideNumber: number,
  slideCount: number
): void {
  slide.addText(`${slideNumber} / ${slideCount}`, {
    x: 11.72,
    y: layout.footerY,
    w: 0.9,
    h: 0.2,
    fontFace: theme.fontFace,
    fontSize: 8.5,
    color: theme.mutedText,
    align: "right",
    margin: 0
  });
}



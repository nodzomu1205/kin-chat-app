import PptxGenJS from "pptxgenjs";
import type {
  FrameBlock,
  FramePresentationSpec,
  PresentationDensity,
  SlideFrame
} from "./schema.js";
import { resolveTheme, type RendererTheme } from "./themes.js";

type Box = { x: number; y: number; w: number; h: number };
type MasterFrameId = SlideFrame["masterFrameId"];
type TextStyle = NonNullable<NonNullable<FrameBlock["renderStyle"]>["textStyle"]>;
type TextFitContext = { scaleByGroup: Map<string, number> };
type BookendSlide = NonNullable<NonNullable<FramePresentationSpec["deckFrame"]>["openingSlide"]>;

const slideLayout = {
  width: 13.333,
  height: 7.5,
  marginX: 0.62,
  titleY: 0.46,
  contentY: 1.34,
  footerY: 7.08
};

export function renderFramePresentationV2(spec: FramePresentationSpec): PptxGenJS {
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
  const textFitContext = buildTextFitContext(spec);
  const openingSlide = enabledBookend(spec.deckFrame?.openingSlide);
  const closingSlide = enabledBookend(spec.deckFrame?.closingSlide);
  const showPageNumber = spec.deckFrame?.pageNumber?.enabled ?? true;
  const pageNumberScope = spec.deckFrame?.pageNumber?.scope || "bodyOnly";
  const allSlideCount =
    spec.slideFrames.length + (openingSlide ? 1 : 0) + (closingSlide ? 1 : 0);
  const bodySlideCount = spec.deckFrame?.slideCount || spec.slideFrames.length;

  if (openingSlide) {
    const slide = pptx.addSlide();
    slide.background = { color: theme.background };
    renderOpeningBookend(slide, openingSlide, spec.title, theme);
    if (showPageNumber && pageNumberScope === "allSlides") {
      addFooter(slide, theme, 1, allSlideCount);
    }
  }

  spec.slideFrames.forEach((frame, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: theme.background };
    const slideNumber =
      pageNumberScope === "allSlides" ? index + 1 + (openingSlide ? 1 : 0) : index + 1;
    const slideCount = pageNumberScope === "allSlides" ? allSlideCount : bodySlideCount;
    renderFrameSlideV2({
      slide,
      frame,
      theme,
      textFitContext,
      masterFrameId: frame.masterFrameId || spec.deckFrame?.masterFrameId || "titleLineFooter",
      density: spec.density || "standard",
      slideNumber,
      slideCount,
      showPageNumber
    });
  });

  if (closingSlide) {
    const slide = pptx.addSlide();
    slide.background = { color: theme.background };
    renderClosingBookend(slide, closingSlide, theme);
    if (showPageNumber && pageNumberScope === "allSlides") {
      addFooter(slide, theme, allSlideCount, allSlideCount);
    }
  }

  return pptx;
}

function enabledBookend(bookend: BookendSlide | undefined) {
  return bookend?.enabled ? bookend : undefined;
}

function renderOpeningBookend(
  slide: PptxGenJS.Slide,
  bookend: BookendSlide,
  deckTitle: string,
  theme: RendererTheme
) {
  const title = bookend.title || deckTitle;
  const subtitle = bookend.subtitle || bookend.message || "";
  const useVisualTreatment = bookend.frameId === "visualTitleCover";
  if (useVisualTreatment) {
    if (bookend.visualRequest?.asset?.base64) {
      renderImage(
        slide,
        bookend.visualRequest.asset,
        { x: 7.3, y: 0.58, w: 5.35, h: 6.35 },
        "visualCover"
      );
    } else {
      slide.addShape("rect", {
        x: 0,
        y: 0,
        w: slideLayout.width,
        h: slideLayout.height,
        fill: { color: theme.surface },
        line: { color: theme.surface, transparency: 100 }
      });
      slide.addShape("rect", {
        x: 7.7,
        y: 0,
        w: 5.7,
        h: slideLayout.height,
        fill: { color: theme.accent, transparency: 82 },
        line: { color: theme.accent, transparency: 100 }
      });
    }
  }
  if (bookend.kicker) {
    slide.addText(bookend.kicker, {
      x: slideLayout.marginX,
      y: 1.0,
      w: 8.6,
      h: 0.28,
      fontFace: theme.fontFace,
      fontSize: 12,
      color: theme.accent,
      bold: true,
      margin: 0
    });
  }
  slide.addText(title, {
    x: slideLayout.marginX,
    y: 1.55,
    w: useVisualTreatment ? 7.2 : 10.8,
    h: 1.25,
    fontFace: theme.fontFace,
    fontSize: title.length > 28 ? 30 : 36,
    color: theme.text,
    bold: true,
    fit: "shrink",
    margin: 0
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: slideLayout.marginX,
      y: 3.05,
      w: useVisualTreatment ? 6.8 : 9.6,
      h: 0.78,
      fontFace: theme.fontFace,
      fontSize: 17,
      color: theme.mutedText,
      fit: "shrink",
      margin: 0
    });
  }
  const meta = [bookend.presenter, bookend.date].filter(Boolean).join(" / ");
  if (meta) {
    slide.addText(meta, {
      x: slideLayout.marginX,
      y: 6.55,
      w: 7.8,
      h: 0.28,
      fontFace: theme.fontFace,
      fontSize: 11,
      color: theme.mutedText,
      margin: 0
    });
  }
  slide.addShape("line", {
    x: slideLayout.marginX,
    y: 4.28,
    w: useVisualTreatment ? 4.8 : 6.2,
    h: 0,
    line: { color: theme.accent, width: 1.6 }
  });
  if (bookend.notes) slide.addNotes(bookend.notes);
}

function renderClosingBookend(
  slide: PptxGenJS.Slide,
  bookend: BookendSlide,
  theme: RendererTheme
) {
  const title = bookend.title || (bookend.frameId === "summaryClosing" ? "Summary" : "- END -");
  slide.addText(title, {
    x: 1.1,
    y: bookend.frameId === "summaryClosing" ? 0.9 : 2.6,
    w: 11.1,
    h: 0.78,
    fontFace: theme.fontFace,
    fontSize: title.length > 24 ? 30 : 38,
    color: theme.text,
    bold: true,
    align: bookend.frameId === "summaryClosing" ? "left" : "center",
    fit: "shrink",
    margin: 0
  });
  if (bookend.frameId === "summaryClosing" && bookend.nextSteps?.length) {
    slide.addText(
      bookend.nextSteps.map((item) => ({ text: item, options: { bullet: { indent: 18, marginPt: 5 }, breakLine: true, fontSize: 18 } })),
      {
        x: 1.18,
        y: 2.05,
        w: 9.8,
        h: 2.8,
        fontFace: theme.fontFace,
        fontSize: 18,
        color: theme.text,
        fit: "shrink",
        margin: [2, 3, 2, 3],
        valign: "top"
      }
    );
  } else if (bookend.message) {
    slide.addText(bookend.message, {
      x: 2.1,
      y: 3.55,
      w: 9.2,
      h: 0.45,
      fontFace: theme.fontFace,
      fontSize: 17,
      color: theme.mutedText,
      align: "center",
      fit: "shrink",
      margin: 0
    });
  }
  if (bookend.contact) {
    slide.addText(bookend.contact, {
      x: 1.1,
      y: 6.58,
      w: 11.1,
      h: 0.26,
      fontFace: theme.fontFace,
      fontSize: 10.5,
      color: theme.mutedText,
      align: bookend.frameId === "summaryClosing" ? "left" : "center",
      margin: 0
    });
  }
  slide.addShape("line", {
    x: bookend.frameId === "summaryClosing" ? 1.1 : 4.65,
    y: bookend.frameId === "summaryClosing" ? 1.72 : 3.35,
    w: bookend.frameId === "summaryClosing" ? 4.8 : 4.0,
    h: 0,
    line: { color: theme.accent, width: 1.4 }
  });
  if (bookend.notes) slide.addNotes(bookend.notes);
}

function renderFrameSlideV2(args: {
  slide: PptxGenJS.Slide;
  frame: FramePresentationSpec["slideFrames"][number];
  theme: RendererTheme;
  textFitContext: TextFitContext;
  masterFrameId: MasterFrameId;
  density: PresentationDensity;
  slideNumber: number;
  slideCount: number;
  showPageNumber: boolean;
}) {
  const { slide, frame, theme } = args;
  const contentBox = {
    x: slideLayout.marginX,
    y: slideLayout.contentY,
    w: slideLayout.width - slideLayout.marginX * 2,
    h: 5.46
  };

  const usesTitleLine = args.masterFrameId === "titleLineFooter" || args.masterFrameId === "logoHeaderFooter";

  if (frame.layoutFrameId === "singleCenter") {
    if (usesTitleLine) {
      addTitle(slide, theme, frame.title);
      renderSingleCenterFrame(slide, frame, theme, args.textFitContext, {
        x: contentBox.x,
        y: contentBox.y + 0.08,
        w: contentBox.w,
        h: contentBox.h - 0.2
      }, false);
    } else {
      renderSingleCenterFrame(slide, frame, theme, args.textFitContext, contentBox, true);
    }
  } else {
    addTitle(slide, theme, frame.title);
    renderLayoutFrame(slide, frame, theme, args.textFitContext, contentBox, args.density);
  }

  if (args.showPageNumber) {
    addFooter(slide, theme, args.slideNumber, args.slideCount);
  }
  if (frame.speakerIntent) slide.addNotes(frame.speakerIntent);
}

function renderSingleCenterFrame(
  slide: PptxGenJS.Slide,
  frame: FramePresentationSpec["slideFrames"][number],
  theme: RendererTheme,
  textFitContext: TextFitContext,
  box: Box,
  addHeroTitle: boolean
) {
  const primary = frame.blocks[0];
  const visual = primary?.visualRequest;
  const imageBox = {
    x: box.x,
    y: box.y + 0.1,
    w: box.w,
    h: box.h - 0.18
  };
  if (addHeroTitle) addLargeTitle(slide, theme, frame.title);

  if (visual?.asset?.base64) {
    renderImage(slide, visual.asset, imageBox, primary?.styleId);
    return;
  }

  if (visual) {
    renderVisualFallback(slide, theme, primary, imageBox);
    return;
  }

  renderTextBlock(slide, primary, theme, textFitContext, {
    x: box.x + 1.1,
    y: box.y + 1.6,
    w: box.w - 2.2,
    h: 2.4
  });
}

function renderLayoutFrame(
  slide: PptxGenJS.Slide,
  frame: FramePresentationSpec["slideFrames"][number],
  theme: RendererTheme,
  textFitContext: TextFitContext,
  box: Box,
  density: PresentationDensity
) {
  if (
    frame.layoutFrameId === "visualLeftTextRight" ||
    frame.layoutFrameId === "textLeftVisualRight" ||
    frame.layoutFrameId === "leftRight50"
  ) {
    const boxes = resolveTwoColumnBoxes(frame.layoutFrameId, frame.blocks[0], frame.blocks[1], box);
    renderBlock(slide, frame.blocks[0], theme, textFitContext, boxes.left, density);
    renderBlock(slide, frame.blocks[1], theme, textFitContext, boxes.right, density);
    return;
  }

  if (frame.layoutFrameId === "heroTopDetailsBottom") {
    renderBlock(slide, frame.blocks[0], theme, textFitContext, { x: box.x, y: box.y, w: box.w, h: 2.95 }, density);
    renderBlock(slide, frame.blocks[1], theme, textFitContext, { x: box.x, y: box.y + 3.25, w: box.w / 2 - 0.18, h: 2.05 }, density);
    renderBlock(slide, frame.blocks[2], theme, textFitContext, { x: box.x + box.w / 2 + 0.18, y: box.y + 3.25, w: box.w / 2 - 0.18, h: 2.05 }, density);
    return;
  }

  if (frame.layoutFrameId === "threeColumns") {
    const gap = 0.28;
    const w = (box.w - gap * 2) / 3;
    frame.blocks.slice(0, 3).forEach((block, index) => {
      renderBlock(slide, block, theme, textFitContext, { x: box.x + index * (w + gap), y: box.y, w, h: box.h }, density);
    });
    return;
  }

  if (frame.layoutFrameId === "twoByTwoGrid") {
    const gapX = 0.36;
    const gapY = 0.34;
    const w = (box.w - gapX) / 2;
    const h = (box.h - gapY) / 2;
    frame.blocks.slice(0, 4).forEach((block, index) => {
      renderBlock(slide, block, theme, textFitContext, {
        x: box.x + (index % 2) * (w + gapX),
        y: box.y + Math.floor(index / 2) * (h + gapY),
        w,
        h
      }, density);
    });
    return;
  }

  renderBlock(slide, frame.blocks[0], theme, textFitContext, box, density);
}

export function resolveTwoColumnBoxes(
  layoutFrameId: FramePresentationSpec["slideFrames"][number]["layoutFrameId"],
  leftBlock: FrameBlock | undefined,
  rightBlock: FrameBlock | undefined,
  box: Box
): { left: Box; right: Box } {
  const gap = 0.54;
  const availableW = box.w - gap;
  const defaultW = availableW / 2;
  if (layoutFrameId === "leftRight50") {
    return {
      left: { x: box.x, y: box.y, w: defaultW, h: box.h },
      right: { x: box.x + defaultW + gap, y: box.y, w: defaultW, h: box.h }
    };
  }

  const visualOnLeft = layoutFrameId === "visualLeftTextRight" || isVisualBlock(leftBlock);
  const visualBlock = visualOnLeft ? leftBlock : rightBlock;
  const visualW = resolveVisualWidth(availableW, resolveBlockAspectRatio(visualBlock));
  const textW = availableW - visualW;
  if (visualOnLeft) {
    return {
      left: { x: box.x, y: box.y, w: visualW, h: box.h },
      right: { x: box.x + visualW + gap, y: box.y, w: textW, h: box.h }
    };
  }
  return {
    left: { x: box.x, y: box.y, w: textW, h: box.h },
    right: { x: box.x + textW + gap, y: box.y, w: visualW, h: box.h }
  };
}

function renderBlock(
  slide: PptxGenJS.Slide,
  block: FrameBlock | undefined,
  theme: RendererTheme,
  textFitContext: TextFitContext,
  box: Box,
  density: PresentationDensity
) {
  if (!block) return;
  if (isVisualBlock(block)) {
    renderVisualBlock(slide, block, theme, box, density);
    return;
  }
  renderTextBlock(slide, block, theme, textFitContext, box);
}

function renderVisualBlock(
  slide: PptxGenJS.Slide,
  block: FrameBlock,
  theme: RendererTheme,
  box: Box,
  density: PresentationDensity
) {
  const visual = block.visualRequest;
  if (visual?.asset?.base64) {
    renderImage(slide, visual.asset, box, block.styleId);
    return;
  }
  renderVisualFallback(slide, theme, block, box, density);
}

function renderImage(
  slide: PptxGenJS.Slide,
  asset: NonNullable<NonNullable<FrameBlock["visualRequest"]>["asset"]>,
  box: Box,
  styleId?: FrameBlock["styleId"]
) {
  const imageBox =
    styleId === "visualCover"
      ? coverBox(box, resolveAssetAspectRatio(asset))
      : containBox(box, resolveAssetAspectRatio(asset));
  slide.addImage({
    data: `data:${asset.mimeType || "image/png"};base64,${asset.base64}`,
    x: imageBox.x,
    y: imageBox.y,
    w: imageBox.w,
    h: imageBox.h
  });
}

function renderTextBlock(
  slide: PptxGenJS.Slide,
  block: FrameBlock | undefined,
  theme: RendererTheme,
  textFitContext: TextFitContext,
  box: Box
) {
  if (!block) return;
  const style = resolveTextStyle(block, box, textFitContext);
  slide.addText(buildTextRuns(block, style), {
    x: box.x,
    y: box.y + 0.04,
    w: box.w,
    h: box.h - 0.08,
    fontFace: theme.fontFace,
    fontSize: style.bodyFontSize,
    color: theme.text,
    fit: "shrink",
    breakLine: false,
    margin: [2, 3, 2, 3],
    valign: "top"
  });
}

function buildTextRuns(block: FrameBlock, style: Required<TextStyle>): PptxGenJS.TextProps[] {
  const runs: PptxGenJS.TextProps[] = [];
  if (block.heading && block.renderStyle?.showHeading !== false) {
    runs.push({
      text: block.heading,
      options: {
        bold: true,
        fontSize: style.headingFontSize,
        breakLine: true,
        paraSpaceAfter: gapToPoints(style.headingGapLines),
        lineSpacingMultiple: style.lineSpacingMultiple
      }
    });
  }
  if (block.text) {
    runs.push({
      text: block.text,
      options: {
        fontSize: style.bodyFontSize,
        breakLine: true,
        paraSpaceAfter: gapToPoints(style.bodyGapLines),
        lineSpacingMultiple: style.lineSpacingMultiple
      }
    });
  }
  (block.items || []).forEach((item) => {
    runs.push({
      text: item,
      options: {
        fontSize: style.itemFontSize,
        bullet: {
          indent: style.bulletIndent,
          marginPt: style.bulletHanging
        },
        breakLine: true,
        paraSpaceAfter: gapToPoints(style.itemGapLines),
        lineSpacingMultiple: style.lineSpacingMultiple
      }
    });
  });
  if (runs.length === 0 && block.visualRequest?.brief) {
    runs.push({
      text: block.visualRequest.brief,
      options: {
        fontSize: style.bodyFontSize,
        lineSpacingMultiple: style.lineSpacingMultiple
      }
    });
  }
  return runs;
}

function gapToPoints(gapLines: number) {
  return Math.max(0, gapLines) * 7;
}

function resolveTextStyle(
  block: FrameBlock,
  box: Box,
  textFitContext: TextFitContext
): Required<TextStyle> {
  const style = {
    ...defaultTextStyleForBlock(block, box),
    ...(block.renderStyle?.textStyle || {})
  };
  const scale = textFitContext.scaleByGroup.get(textFitGroupKey(block, box)) || 1;
  return scaleTextStyle(style, scale);
}

function buildTextFitContext(spec: FramePresentationSpec): TextFitContext {
  const scales = new Map<string, number[]>();
  collectTextFitBlocks(spec).forEach(({ block, box }) => {
    const style = {
      ...defaultTextStyleForBlock(block, box),
      ...(block.renderStyle?.textStyle || {})
    };
    const scale = estimateTextFitScale(block, box, style);
    const key = textFitGroupKey(block, box);
    scales.set(key, [...(scales.get(key) || []), scale]);
  });
  const scaleByGroup = new Map<string, number>();
  scales.forEach((values, key) => {
    scaleByGroup.set(key, Math.min(...values));
  });
  return { scaleByGroup };
}

function collectTextFitBlocks(spec: FramePresentationSpec) {
  const contentBox = {
    x: slideLayout.marginX,
    y: slideLayout.contentY,
    w: slideLayout.width - slideLayout.marginX * 2,
    h: 5.46
  };
  return spec.slideFrames.flatMap((frame) =>
    resolveFrameBlockBoxes(frame, contentBox)
      .filter(({ block }) => block && !isVisualBlock(block))
      .map(({ block, box }) => ({ block: block as FrameBlock, box }))
  );
}

function resolveFrameBlockBoxes(
  frame: FramePresentationSpec["slideFrames"][number],
  box: Box
): Array<{ block: FrameBlock | undefined; box: Box }> {
  if (frame.layoutFrameId === "singleCenter" || frame.layoutFrameId === "titleBody") {
    return [{ block: frame.blocks[0], box }];
  }
  if (
    frame.layoutFrameId === "visualLeftTextRight" ||
    frame.layoutFrameId === "textLeftVisualRight" ||
    frame.layoutFrameId === "leftRight50"
  ) {
    const boxes = resolveTwoColumnBoxes(frame.layoutFrameId, frame.blocks[0], frame.blocks[1], box);
    return [
      { block: frame.blocks[0], box: boxes.left },
      { block: frame.blocks[1], box: boxes.right }
    ];
  }
  if (frame.layoutFrameId === "heroTopDetailsBottom") {
    return [
      { block: frame.blocks[0], box: { x: box.x, y: box.y, w: box.w, h: 2.95 } },
      { block: frame.blocks[1], box: { x: box.x, y: box.y + 3.25, w: box.w / 2 - 0.18, h: 2.05 } },
      { block: frame.blocks[2], box: { x: box.x + box.w / 2 + 0.18, y: box.y + 3.25, w: box.w / 2 - 0.18, h: 2.05 } }
    ];
  }
  if (frame.layoutFrameId === "threeColumns") {
    const gap = 0.28;
    const w = (box.w - gap * 2) / 3;
    return frame.blocks.slice(0, 3).map((block, index) => ({
      block,
      box: { x: box.x + index * (w + gap), y: box.y, w, h: box.h }
    }));
  }
  if (frame.layoutFrameId === "twoByTwoGrid") {
    const gapX = 0.36;
    const gapY = 0.34;
    const w = (box.w - gapX) / 2;
    const h = (box.h - gapY) / 2;
    return frame.blocks.slice(0, 4).map((block, index) => ({
      block,
      box: {
        x: box.x + (index % 2) * (w + gapX),
        y: box.y + Math.floor(index / 2) * (h + gapY),
        w,
        h
      }
    }));
  }
  return [{ block: frame.blocks[0], box }];
}

function textFitGroupKey(block: FrameBlock, box: Box) {
  const widthGroup = box.w >= 7 ? "wide" : box.w >= 5 ? "medium" : "narrow";
  return `${block.styleId}:${widthGroup}`;
}

function estimateTextFitScale(
  block: FrameBlock,
  box: Box,
  style: Required<TextStyle>
) {
  const required = estimateTextHeightPoints(block, box, style);
  const available = Math.max(20, box.h * 72 - 12);
  if (required <= available) return 1;
  return Math.max(0.78, available / required);
}

function estimateTextHeightPoints(
  block: FrameBlock,
  box: Box,
  style: Required<TextStyle>
) {
  const charsPerLine = Math.max(10, Math.floor(box.w * 12.5));
  let height = 0;
  if (block.heading && block.renderStyle?.showHeading !== false) {
    height += estimateLines(block.heading, charsPerLine) * style.headingFontSize * 1.2;
    height += gapToPoints(style.headingGapLines);
  }
  if (block.text) {
    height += estimateLines(block.text, charsPerLine) * style.bodyFontSize * 1.2;
    height += gapToPoints(style.bodyGapLines);
  }
  (block.items || []).forEach((item) => {
    height += estimateLines(item, Math.max(8, charsPerLine - 4)) * style.itemFontSize * 1.2;
    height += gapToPoints(style.itemGapLines);
  });
  return height;
}

function estimateLines(text: string, charsPerLine: number) {
  return Math.max(1, Math.ceil(Array.from(text).length / charsPerLine));
}

function scaleTextStyle(style: Required<TextStyle>, scale: number): Required<TextStyle> {
  return {
    ...style,
    headingFontSize: roundFont(style.headingFontSize * scale),
    bodyFontSize: roundFont(style.bodyFontSize * scale),
    itemFontSize: roundFont(style.itemFontSize * scale)
  };
}

function roundFont(value: number) {
  return Math.round(value * 10) / 10;
}

function defaultTextStyleForBlock(block: FrameBlock, box: Box): Required<TextStyle> {
  const explicit = block.renderStyle?.fontSize || block.renderStyle?.itemFontSize;
  if (explicit === "xlarge") return baseTextStyle(18, 17, 16);
  if (explicit === "large") return baseTextStyle(17, 15.5, 15);
  if (explicit === "small") return baseTextStyle(13, 12, 11.5);
  const length = blockTextLines(block).join("").length;
  if (length > 240) {
    return baseTextStyle(
      box.w >= 7 ? 14 : 12.4,
      box.w >= 7 ? 13 : 11.6,
      box.w >= 7 ? 12.5 : 11.2
    );
  }
  if (length > 160) {
    return baseTextStyle(
      box.w >= 7 ? 15.5 : 13.6,
      box.w >= 7 ? 14.2 : 12.4,
      box.w >= 7 ? 13.7 : 12
    );
  }
  if (box.w >= 7) return baseTextStyle(17, 15.2, 14.7);
  return baseTextStyle(16, 14.2, 13.7);
}

function baseTextStyle(
  headingFontSize: number,
  bodyFontSize: number,
  itemFontSize: number
): Required<TextStyle> {
  return {
    headingFontSize,
    bodyFontSize,
    itemFontSize,
    headingGapLines: 1,
    bodyGapLines: 1,
    itemGapLines: 1,
    bulletIndent: 18,
    bulletHanging: 5,
    lineSpacingMultiple: 1.08
  };
}

function renderVisualFallback(
  slide: PptxGenJS.Slide,
  theme: RendererTheme,
  block: FrameBlock | undefined,
  box: Box,
  density: PresentationDensity = "standard"
) {
  const visual = block?.visualRequest;
  const label = block?.heading || block?.id || "visual";
  const text = [label, visual?.brief || visual?.prompt || "Visual placeholder"]
    .filter(Boolean)
    .join("\n");
  slide.addShape("rect", {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    fill: { color: theme.surface },
    line: { color: theme.border, transparency: 20, width: 0.8 }
  });
  slide.addText(text, {
    x: box.x + 0.24,
    y: box.y + 0.24,
    w: box.w - 0.48,
    h: box.h - 0.48,
    fontFace: theme.fontFace,
    fontSize: density === "dense" ? 13 : 15,
    color: theme.mutedText,
    fit: "shrink",
    align: "center",
    valign: "middle",
    margin: 0.04
  });
}

function addTitle(slide: PptxGenJS.Slide, theme: RendererTheme, title: string) {
  const fontSize = title.length > 28 ? 21 : 24;
  slide.addText(title, {
    x: slideLayout.marginX,
    y: slideLayout.titleY,
    w: slideLayout.width - slideLayout.marginX * 2,
    h: 0.45,
    fontFace: theme.fontFace,
    fontSize,
    bold: true,
    color: theme.text,
    fit: "shrink",
    margin: 0
  });
  slide.addShape("line", {
    x: slideLayout.marginX,
    y: 1.02,
    w: slideLayout.width - slideLayout.marginX * 2,
    h: 0,
    line: { color: theme.accent, width: 1.4 }
  });
}

function addLargeTitle(slide: PptxGenJS.Slide, theme: RendererTheme, title: string) {
  const fontSize = title.length > 24 ? 26 : 30;
  slide.addText(title, {
    x: slideLayout.marginX + 0.08,
    y: 0.58,
    w: slideLayout.width - slideLayout.marginX * 2 - 0.16,
    h: 0.58,
    fontFace: theme.fontFace,
    fontSize,
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
) {
  slide.addText(`${slideNumber} / ${slideCount}`, {
    x: 11.72,
    y: slideLayout.footerY,
    w: 0.9,
    h: 0.2,
    fontFace: theme.fontFace,
    fontSize: 8.5,
    color: theme.mutedText,
    align: "right",
    margin: 0
  });
}

function blockTextLines(block: FrameBlock) {
  const lines: string[] = [];
  if (block.heading) lines.push(block.heading);
  if (block.text) lines.push(block.text);
  (block.items || []).forEach((item) => lines.push(`• ${item}`));
  return lines.length > 0 ? lines : [block.visualRequest?.brief || ""].filter(Boolean);
}

function isVisualBlock(block: FrameBlock | undefined) {
  return !!(
    block?.visualRequest ||
    block?.kind === "visual" ||
    block?.styleId === "visualContain" ||
    block?.styleId === "visualCover"
  );
}

function resolveVisualWidth(availableW: number, aspectRatio?: number) {
  if (!aspectRatio || !Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    return availableW * 0.5;
  }
  if (aspectRatio <= 0.82) return availableW * 0.34;
  if (aspectRatio <= 1.22) return availableW * 0.42;
  if (aspectRatio >= 1.75) return availableW * 0.56;
  return availableW * 0.5;
}

function resolveBlockAspectRatio(block: FrameBlock | undefined) {
  const asset = block?.visualRequest?.asset;
  return asset ? resolveAssetAspectRatio(asset) : undefined;
}

function resolveAssetAspectRatio(
  asset: NonNullable<NonNullable<FrameBlock["visualRequest"]>["asset"]>
) {
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

function containBox(box: Box, aspectRatio?: number): Box {
  if (!aspectRatio || !Number.isFinite(aspectRatio) || aspectRatio <= 0) return box;
  const boxRatio = box.w / box.h;
  if (aspectRatio > boxRatio) {
    const h = box.w / aspectRatio;
    return { x: box.x, y: box.y + (box.h - h) / 2, w: box.w, h };
  }
  const w = box.h * aspectRatio;
  return { x: box.x + (box.w - w) / 2, y: box.y, w, h: box.h };
}

function coverBox(box: Box, aspectRatio?: number): Box {
  if (!aspectRatio || !Number.isFinite(aspectRatio) || aspectRatio <= 0) return box;
  const boxRatio = box.w / box.h;
  if (aspectRatio > boxRatio) {
    const w = box.h * aspectRatio;
    return { x: box.x + (box.w - w) / 2, y: box.y, w, h: box.h };
  }
  const h = box.w / aspectRatio;
  return { x: box.x, y: box.y + (box.h - h) / 2, w: box.w, h };
}

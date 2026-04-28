import PptxGenJS from "pptxgenjs";
import type {
  BulletItem,
  ColumnContent,
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

export async function renderPresentationToFile(
  spec: PresentationSpec,
  outputPath: string
): Promise<void> {
  const pptx = renderPresentation(spec);
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

  slide.addText(slideSpec.title, {
    x: 0.76,
    y: 1.62,
    w: 10.4,
    h: 1.25,
    fontFace: theme.fontFace,
    fontSize: 36,
    bold: true,
    fit: "shrink",
    color: theme.text,
    margin: 0
  });

  if (slideSpec.subtitle) {
    slide.addText(slideSpec.subtitle, {
      x: 0.78,
      y: 3.08,
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
  addColumn(slide, theme, resolveColumn(slideSpec, "left"), 0.76, y, 5.65, density);
  addColumn(slide, theme, resolveColumn(slideSpec, "right"), 6.92, y, 5.65, density);
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
  slide.addShape("roundRect", {
    x,
    y,
    w,
    h: 3.75,
    rectRadius: 0.06,
    fill: { color: theme.surface },
    line: { color: theme.border, width: 1 }
  });
  slide.addText(column.heading, {
    x: x + 0.28,
    y: y + 0.25,
    w: w - 0.55,
    h: 0.36,
    fontFace: theme.fontFace,
    fontSize: 16,
    bold: true,
    color: theme.accent,
    fit: "shrink",
    margin: 0
  });

  let contentY = y + 0.8;
  if (column.body) {
    slide.addText(column.body, {
      x: x + 0.28,
      y: contentY,
      w: w - 0.55,
      h: 0.58,
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
      x + 0.5,
      contentY + index * settings.columnBulletGap,
      w - 0.75,
      settings
    );
  });
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
    bulletLimit: 7,
    columnBulletLimit: 5,
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



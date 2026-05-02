import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const presentationThemeSchema = z.enum([
  "business-clean",
  "warm-minimal",
  "executive-dark"
]);

export const presentationDensitySchema = z.enum([
  "concise",
  "standard",
  "detailed",
  "dense"
]);

export const frameMasterSchema = z.enum([
  "plain",
  "titleLineFooter",
  "logoHeaderFooter",
  "fullBleedVisual"
]);

export const frameLayoutSchema = z.enum([
  "singleCenter",
  "titleBody",
  "leftRight50",
  "visualLeftTextRight",
  "textLeftVisualRight",
  "heroTopDetailsBottom",
  "threeColumns",
  "twoByTwoGrid"
]);

export const frameBlockStyleSchema = z.enum([
  "headlineCenter",
  "textStackTopLeft",
  "listCompact",
  "visualContain",
  "visualCover",
  "callout"
]);

export const bookendFrameSchema = z.enum([
  "titleCover",
  "visualTitleCover",
  "endSlide",
  "summaryClosing"
]);

export const bulletItemSchema = z
  .object({
    text: nonEmptyString,
    detail: z.string().trim().optional(),
    emphasis: z.enum(["normal", "strong", "muted"]).optional()
  })
  .passthrough();

export const columnContentSchema = z
  .object({
    heading: nonEmptyString,
    body: z.string().trim().optional(),
    bullets: z.array(bulletItemSchema).optional()
  })
  .passthrough();

export const cardContentSchema = z
  .object({
    title: nonEmptyString,
    body: z.string().trim().optional(),
    bullets: z.array(bulletItemSchema).optional(),
    kind: z.enum(["text", "visual", "callout"]).optional()
  })
  .passthrough();

export const titleSlideSchema = z
  .object({
    id: z.string().trim().optional(),
    type: z.literal("title"),
    title: nonEmptyString,
    subtitle: z.string().trim().optional(),
    keyVisual: z.string().trim().optional(),
    kicker: z.string().trim().optional(),
    presenter: z.string().trim().optional(),
    date: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
  .passthrough();

export const sectionSlideSchema = z
  .object({
    id: z.string().trim().optional(),
    type: z.literal("section"),
    title: nonEmptyString,
    subtitle: z.string().trim().optional(),
    sectionNumber: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
  .passthrough();

export const bulletsSlideSchema = z
  .object({
    id: z.string().trim().optional(),
    type: z.literal("bullets"),
    title: nonEmptyString,
    lead: z.string().trim().optional(),
    bullets: z.array(bulletItemSchema).min(1),
    takeaway: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
  .passthrough();

export const twoColumnSlideSchema = z
  .object({
    id: z.string().trim().optional(),
    type: z.literal("twoColumn"),
    title: nonEmptyString,
    lead: z.string().trim().optional(),
    layoutVariant: z
      .enum(["textLeftVisualRight", "visualLeftTextRight", "visualHero"])
      .optional(),
    left: columnContentSchema,
    right: columnContentSchema,
    takeaway: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
  .passthrough();

export const tableSlideSchema = z
  .object({
    id: z.string().trim().optional(),
    type: z.literal("table"),
    title: nonEmptyString,
    lead: z.string().trim().optional(),
    columns: z.array(nonEmptyString).min(2).max(5),
    rows: z.array(z.array(z.string().trim())).min(1).max(8),
    takeaway: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
  .passthrough()
  .superRefine((slide, context) => {
    slide.rows.forEach((row, rowIndex) => {
      if (row.length !== slide.columns.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rows", rowIndex],
          message: `Row ${rowIndex + 1} has ${row.length} cells but expected ${slide.columns.length}.`
        });
      }
    });
  });

export const cardsSlideSchema = z
  .object({
    id: z.string().trim().optional(),
    type: z.literal("cards"),
    title: nonEmptyString,
    lead: z.string().trim().optional(),
    layoutVariant: z.enum(["threeColumns", "twoByTwoGrid", "heroTopDetailsBottom"]).optional(),
    cards: z.array(cardContentSchema).min(1).max(8),
    takeaway: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
  .passthrough();

export const closingSlideSchema = z
  .object({
    id: z.string().trim().optional(),
    type: z.literal("closing"),
    title: nonEmptyString,
    message: z.string().trim().optional(),
    nextSteps: z.array(nonEmptyString).optional(),
    contact: z.string().trim().optional(),
    notes: z.string().trim().optional()
  })
  .passthrough();

export const slideSchema = z.union([
  titleSlideSchema,
  sectionSlideSchema,
  bulletsSlideSchema,
  twoColumnSlideSchema,
  tableSlideSchema,
  cardsSlideSchema,
  closingSlideSchema
]);

export const presentationSpecSchema = z
  .object({
    version: z.literal("0.1"),
    title: nonEmptyString,
    subtitle: z.string().trim().optional(),
    language: z.enum(["ja", "en"]).optional(),
    audience: z.string().trim().optional(),
    purpose: z.string().trim().optional(),
    theme: presentationThemeSchema.optional(),
    density: presentationDensitySchema.optional(),
    slides: z.array(slideSchema).min(1).max(20)
  })
  .passthrough();

export const frameVisualRequestSchema = z
  .object({
    type: z
      .enum(["none", "photo", "illustration", "diagram", "chart", "map", "iconSet", "table"])
      .default("diagram"),
    brief: z.string().trim().optional(),
    prompt: z.string().trim().optional(),
    promptNote: z.string().trim().optional(),
    preferredImageId: z.string().trim().optional(),
    labels: z.array(nonEmptyString).optional(),
    asset: z
      .object({
        imageId: z.string().trim().optional(),
        mimeType: z.string().trim().default("image/png"),
        base64: z.string().trim(),
        alt: z.string().trim().optional(),
        sourcePromptHash: z.string().trim().optional(),
        widthPx: z.number().positive().optional(),
        heightPx: z.number().positive().optional(),
        aspectRatio: z.number().positive().optional(),
        orientation: z.enum(["landscape", "portrait", "square", "unknown"]).optional()
      })
      .optional(),
    renderStyle: z
      .object({
        orientation: z.enum(["horizontal", "vertical"]).optional(),
        showBrief: z.boolean().optional()
      })
      .optional()
  })
  .passthrough();

export const deckBookendSlideSchema = z
  .object({
    enabled: z.boolean().default(true),
    frameId: bookendFrameSchema,
    title: z.string().trim().optional(),
    subtitle: z.string().trim().optional(),
    message: z.string().trim().optional(),
    kicker: z.string().trim().optional(),
    presenter: z.string().trim().optional(),
    date: z.string().trim().optional(),
    nextSteps: z.array(nonEmptyString).optional(),
    contact: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    visualRequest: frameVisualRequestSchema.optional()
  })
  .passthrough();

export const frameBlockSchema = z
  .object({
    id: nonEmptyString,
    kind: z.enum(["textStack", "visual", "list", "callout"]),
    styleId: frameBlockStyleSchema,
    heading: z.string().trim().optional(),
    text: z.string().trim().optional(),
    items: z.array(nonEmptyString).optional(),
    renderStyle: z
      .object({
        fontSize: z.enum(["small", "standard", "large", "xlarge"]).optional(),
        itemFontSize: z.enum(["small", "standard", "large", "xlarge"]).optional(),
        showHeading: z.boolean().optional(),
        textStyle: z
          .object({
            headingFontSize: z.number().positive().optional(),
            bodyFontSize: z.number().positive().optional(),
            itemFontSize: z.number().positive().optional(),
            headingGapLines: z.number().min(0).max(3).optional(),
            bodyGapLines: z.number().min(0).max(3).optional(),
            itemGapLines: z.number().min(0).max(3).optional(),
            bulletIndent: z.number().min(0).optional(),
            bulletHanging: z.number().min(0).optional(),
            lineSpacingMultiple: z.number().positive().max(3).optional()
          })
          .optional()
      })
      .optional(),
    visualRequest: frameVisualRequestSchema.optional()
  })
  .passthrough();

export const deckFrameSchema = z
  .object({
    slideCount: z.number().int().positive().optional(),
    masterFrameId: frameMasterSchema.default("titleLineFooter"),
    background: z.string().trim().optional(),
    wallpaper: z.string().trim().optional(),
    typography: z
      .object({
        fontFamily: z.string().trim().optional(),
        bodyScale: z.number().positive().max(2).optional(),
        itemScale: z.number().positive().max(2).optional(),
        preferUniformTextSize: z.boolean().optional(),
        minBodyFontSize: z.number().positive().optional(),
        maxBodyFontSize: z.number().positive().optional()
      })
      .optional(),
    pageNumber: z
      .object({
        enabled: z.boolean().default(true),
        position: z.enum(["bottomRight", "bottomCenter", "bottomLeft"]).optional(),
        style: z.string().trim().optional(),
        scope: z.enum(["bodyOnly", "allSlides"]).optional()
      })
      .optional(),
    openingSlide: deckBookendSlideSchema.optional(),
    closingSlide: deckBookendSlideSchema.optional(),
    logo: z
      .object({
        enabled: z.boolean().default(false),
        position: z.enum(["topRight", "topLeft", "bottomRight", "bottomLeft"]).optional(),
        label: z.string().trim().optional()
      })
      .optional()
  })
  .passthrough();

export const slideFrameSchema = z
  .object({
    slideNumber: z.number().int().positive(),
    title: nonEmptyString,
    masterFrameId: frameMasterSchema.default("titleLineFooter"),
    layoutFrameId: frameLayoutSchema,
    speakerIntent: z.string().trim().optional(),
    blocks: z.array(frameBlockSchema).min(1).max(10)
  })
  .passthrough();

export const framePresentationSpecSchema = z
  .object({
    version: z.literal("0.1-frame"),
    title: nonEmptyString,
    language: z.enum(["ja", "en"]).optional(),
    theme: presentationThemeSchema.optional(),
    density: presentationDensitySchema.optional(),
    deckFrame: deckFrameSchema.optional(),
    slideFrames: z.array(slideFrameSchema).min(1).max(20)
  })
  .passthrough();

export type PresentationSpec = z.infer<typeof presentationSpecSchema>;
export type SlideSpec = z.infer<typeof slideSchema>;
export type BulletItem = z.infer<typeof bulletItemSchema>;
export type ColumnContent = z.infer<typeof columnContentSchema>;
export type CardContent = z.infer<typeof cardContentSchema>;
export type PresentationTheme = z.infer<typeof presentationThemeSchema>;
export type PresentationDensity = z.infer<typeof presentationDensitySchema>;
export type FramePresentationSpec = z.infer<typeof framePresentationSpecSchema>;
export type SlideFrame = z.infer<typeof slideFrameSchema>;
export type FrameBlock = z.infer<typeof frameBlockSchema>;

export function parsePresentationSpec(input: unknown): PresentationSpec {
  return presentationSpecSchema.parse(input);
}

export function parseFramePresentationSpec(input: unknown): FramePresentationSpec {
  return framePresentationSpecSchema.parse(input);
}

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

export const titleSlideSchema = z
  .object({
    id: z.string().trim().optional(),
    type: z.literal("title"),
    title: nonEmptyString,
    subtitle: z.string().trim().optional(),
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

export type PresentationSpec = z.infer<typeof presentationSpecSchema>;
export type SlideSpec = z.infer<typeof slideSchema>;
export type BulletItem = z.infer<typeof bulletItemSchema>;
export type ColumnContent = z.infer<typeof columnContentSchema>;
export type PresentationTheme = z.infer<typeof presentationThemeSchema>;
export type PresentationDensity = z.infer<typeof presentationDensitySchema>;

export function parsePresentationSpec(input: unknown): PresentationSpec {
  return presentationSpecSchema.parse(input);
}

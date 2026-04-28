import { z } from "zod";
import {
  presentationSpecSchema,
  presentationThemeSchema,
  slideSchema,
  type PresentationSpec,
  type SlideSpec
} from "./schema.js";

const slideNumberSchema = z.number().int().min(1);

const updateDeckOperationSchema = z
  .object({
    op: z.literal("updateDeck"),
    title: z.string().trim().min(1).optional(),
    subtitle: z.string().trim().optional(),
    audience: z.string().trim().optional(),
    purpose: z.string().trim().optional(),
    theme: presentationThemeSchema.optional()
  })
  .strict();

const updateSlideOperationSchema = z
  .object({
    op: z.literal("updateSlide"),
    slideNumber: slideNumberSchema,
    patch: z.record(z.string(), z.unknown())
  })
  .strict();

const replaceSlideOperationSchema = z
  .object({
    op: z.literal("replaceSlide"),
    slideNumber: slideNumberSchema,
    slide: slideSchema
  })
  .strict();

const insertSlideOperationSchema = z
  .object({
    op: z.literal("insertSlide"),
    afterSlideNumber: z.number().int().min(0),
    slide: slideSchema
  })
  .strict();

const deleteSlideOperationSchema = z
  .object({
    op: z.literal("deleteSlide"),
    slideNumber: slideNumberSchema
  })
  .strict();

const moveSlideOperationSchema = z
  .object({
    op: z.literal("moveSlide"),
    fromSlideNumber: slideNumberSchema,
    toSlideNumber: slideNumberSchema
  })
  .strict();

export const presentationPatchOperationSchema = z.discriminatedUnion("op", [
  updateDeckOperationSchema,
  updateSlideOperationSchema,
  replaceSlideOperationSchema,
  insertSlideOperationSchema,
  deleteSlideOperationSchema,
  moveSlideOperationSchema
]);

export const presentationPatchSchema = z
  .object({
    version: z.literal("0.1"),
    description: z.string().trim().optional(),
    operations: z.array(presentationPatchOperationSchema).min(1).max(50)
  })
  .strict();

export type PresentationPatch = z.infer<typeof presentationPatchSchema>;
export type PresentationPatchOperation = z.infer<typeof presentationPatchOperationSchema>;

export function parsePresentationPatch(input: unknown): PresentationPatch {
  return presentationPatchSchema.parse(input);
}

export function applyPresentationPatch(
  spec: PresentationSpec,
  patch: PresentationPatch
): PresentationSpec {
  const nextSpec = clone(spec);

  for (const operation of patch.operations) {
    applyOperation(nextSpec, operation);
  }

  return presentationSpecSchema.parse(nextSpec);
}

function applyOperation(
  spec: PresentationSpec,
  operation: PresentationPatchOperation
): void {
  switch (operation.op) {
    case "updateDeck":
      applyDeckUpdate(spec, operation);
      return;
    case "updateSlide":
      updateSlide(spec, operation.slideNumber, operation.patch);
      return;
    case "replaceSlide":
      replaceSlide(spec, operation.slideNumber, operation.slide);
      return;
    case "insertSlide":
      insertSlide(spec, operation.afterSlideNumber, operation.slide);
      return;
    case "deleteSlide":
      deleteSlide(spec, operation.slideNumber);
      return;
    case "moveSlide":
      moveSlide(spec, operation.fromSlideNumber, operation.toSlideNumber);
      return;
  }
}

function applyDeckUpdate(
  spec: PresentationSpec,
  operation: Extract<PresentationPatchOperation, { op: "updateDeck" }>
): void {
  if (operation.title !== undefined) spec.title = operation.title;
  if (operation.subtitle !== undefined) spec.subtitle = operation.subtitle;
  if (operation.audience !== undefined) spec.audience = operation.audience;
  if (operation.purpose !== undefined) spec.purpose = operation.purpose;
  if (operation.theme !== undefined) spec.theme = operation.theme;
}

function updateSlide(
  spec: PresentationSpec,
  slideNumber: number,
  patch: Record<string, unknown>
): void {
  const index = toSlideIndex(spec, slideNumber);
  const merged = {
    ...spec.slides[index],
    ...patch
  };
  spec.slides[index] = slideSchema.parse(merged);
}

function replaceSlide(
  spec: PresentationSpec,
  slideNumber: number,
  slide: SlideSpec
): void {
  const index = toSlideIndex(spec, slideNumber);
  spec.slides[index] = slide;
}

function insertSlide(
  spec: PresentationSpec,
  afterSlideNumber: number,
  slide: SlideSpec
): void {
  if (afterSlideNumber > spec.slides.length) {
    throw new Error(
      `Cannot insert after slide ${afterSlideNumber}; presentation has ${spec.slides.length} slides.`
    );
  }
  spec.slides.splice(afterSlideNumber, 0, slide);
}

function deleteSlide(spec: PresentationSpec, slideNumber: number): void {
  if (spec.slides.length === 1) {
    throw new Error("Cannot delete the only slide in a presentation.");
  }
  const index = toSlideIndex(spec, slideNumber);
  spec.slides.splice(index, 1);
}

function moveSlide(
  spec: PresentationSpec,
  fromSlideNumber: number,
  toSlideNumber: number
): void {
  const fromIndex = toSlideIndex(spec, fromSlideNumber);
  const toIndex = toSlideIndex(spec, toSlideNumber);
  const [slide] = spec.slides.splice(fromIndex, 1);
  spec.slides.splice(toIndex, 0, slide);
}

function toSlideIndex(spec: PresentationSpec, slideNumber: number): number {
  const index = slideNumber - 1;
  if (index < 0 || index >= spec.slides.length) {
    throw new Error(
      `Slide ${slideNumber} does not exist; presentation has ${spec.slides.length} slides.`
    );
  }
  return index;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

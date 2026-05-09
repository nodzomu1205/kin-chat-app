import type {
  PresentationTaskLayoutFrameId,
  PresentationTaskSlideBlock,
} from "@/types/task";
import { supportedLayoutFrameId } from "@/lib/app/presentation/presentationSlideFrameSupportedValues";

const LAYOUT_BLOCK_LIMITS: Record<
  PresentationTaskLayoutFrameId,
  { min: number; max: number }
> = {
  singleCenter: { min: 1, max: 1 },
  titleBody: { min: 1, max: 1 },
  leftRight50: { min: 2, max: 2 },
  visualLeftTextRight: { min: 2, max: 2 },
  textLeftVisualRight: { min: 2, max: 2 },
  heroTopDetailsBottom: { min: 3, max: 3 },
  threeColumns: { min: 3, max: 3 },
  twoByTwoGrid: { min: 4, max: 4 },
  adaptiveVisualMain: { min: 1, max: 7 },
  adaptiveTextMain: { min: 1, max: 7 },
};

export function normalizeLayoutFrameId(
  value: unknown,
  blocks: PresentationTaskSlideBlock[]
): PresentationTaskLayoutFrameId {
  const requested = supportedLayoutFrameId(value);
  const limits = LAYOUT_BLOCK_LIMITS[requested];
  if (blocks.length >= limits.min && blocks.length <= limits.max) {
    return requested;
  }
  if (blocks.length === 1) return "titleBody";
  if (blocks.length === 2) {
    const firstVisual = !!blocks[0]?.visualRequest;
    const secondVisual = !!blocks[1]?.visualRequest;
    if (firstVisual && !secondVisual) return "visualLeftTextRight";
    if (!firstVisual && secondVisual) return "textLeftVisualRight";
    return "leftRight50";
  }
  if (blocks.length === 3) return "threeColumns";
  if (blocks.length === 4) return "twoByTwoGrid";
  return "titleBody";
}

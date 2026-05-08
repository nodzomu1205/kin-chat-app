import type {
  PresentationTaskBlockStyleId,
  PresentationTaskBookendFrameId,
  PresentationTaskLayoutFrameId,
  PresentationTaskMasterFrameId,
  PresentationTaskSlideBlock,
} from "@/types/task";

type FrameDefinition<TId extends string> = {
  id: TId;
  label: string;
  description: string;
};

export const PRESENTATION_MASTER_FRAMES: Array<
  FrameDefinition<PresentationTaskMasterFrameId>
> = [
  {
    id: "plain",
    label: "Plain",
    description: "No fixed title band or footer decoration.",
  },
  {
    id: "titleLineFooter",
    label: "Title line + footer",
    description: "Top title area, thin separator, and page footer.",
  },
  {
    id: "logoHeaderFooter",
    label: "Logo header + footer",
    description: "Header area with optional logo slot and footer.",
  },
  {
    id: "fullBleedVisual",
    label: "Full bleed visual",
    description: "Visual-first slide with minimal chrome.",
  },
];

export const PRESENTATION_LAYOUT_FRAMES: Array<
  FrameDefinition<PresentationTaskLayoutFrameId> & { blockIds: string[] }
> = [
  {
    id: "singleCenter",
    label: "Single center",
    description: "One centered block for a strong statement or visual.",
    blockIds: ["block1"],
  },
  {
    id: "titleBody",
    label: "Title + body",
    description: "Main message followed by supporting text or bullets.",
    blockIds: ["block1"],
  },
  {
    id: "leftRight50",
    label: "Left 50 / Right 50",
    description: "Two equally weighted blocks.",
    blockIds: ["block1", "block2"],
  },
  {
    id: "visualLeftTextRight",
    label: "Visual left / text right",
    description: "Visual block on the left, message stack on the right.",
    blockIds: ["block1", "block2"],
  },
  {
    id: "textLeftVisualRight",
    label: "Text left / visual right",
    description: "Message stack on the left, visual block on the right.",
    blockIds: ["block1", "block2"],
  },
  {
    id: "heroTopDetailsBottom",
    label: "Hero top / details bottom",
    description: "Large top block with compact supporting blocks below.",
    blockIds: ["block1", "block2", "block3"],
  },
  {
    id: "threeColumns",
    label: "Three columns",
    description: "Three parallel blocks with equal emphasis.",
    blockIds: ["block1", "block2", "block3"],
  },
  {
    id: "twoByTwoGrid",
    label: "2 x 2 grid",
    description: "Four compact blocks for categories or options.",
    blockIds: ["block1", "block2", "block3", "block4"],
  },
  {
    id: "adaptiveVisualMain",
    label: "Adaptive visual main",
    description: "Primary visual is placed top-left and scaled by asset aspect ratio; remaining space may hold a short annotation.",
    blockIds: ["block1", "block2"],
  },
  {
    id: "adaptiveTextMain",
    label: "Adaptive text main",
    description: "Primary text is placed top-left with remaining space used for one or more related visuals.",
    blockIds: ["block1", "block2", "block3", "block4"],
  },
];

export const PRESENTATION_BOOKEND_FRAMES: Array<
  FrameDefinition<PresentationTaskBookendFrameId>
> = [
  {
    id: "titleCover",
    label: "Title cover",
    description: "Opening title slide with title, subtitle, and optional presenter/date.",
  },
  {
    id: "visualTitleCover",
    label: "Visual title cover",
    description: "Opening slide that pairs a large visual mood with deck title metadata.",
  },
  {
    id: "endSlide",
    label: "End slide",
    description: "Minimal closing slide with an END or thank-you message.",
  },
  {
    id: "summaryClosing",
    label: "Summary closing",
    description: "Closing slide with a short final message and next-step bullets.",
  },
];

export const PRESENTATION_BLOCK_STYLES: Array<
  FrameDefinition<PresentationTaskBlockStyleId> & {
    textStyle?: NonNullable<PresentationTaskSlideBlock["renderStyle"]>["textStyle"];
  }
> = [
  {
    id: "headlineCenter",
    label: "Headline center",
    description: "Large centered headline treatment.",
  },
  {
    id: "textStackTopLeft",
    label: "Text stack top-left",
    description: "Heading plus body/items aligned to the top-left.",
    textStyle: {
      headingFontSize: 18,
      bodyFontSize: 16.5,
      itemFontSize: 16,
      headingGapLines: 2,
      bodyGapLines: 2,
      itemGapLines: 2,
      bulletIndent: 18,
      bulletHanging: 5,
      lineSpacingMultiple: 1.08,
    },
  },
  {
    id: "listCompact",
    label: "Compact list",
    description: "Dense list treatment for supporting points.",
    textStyle: {
      headingFontSize: 18,
      itemFontSize: 16,
      headingGapLines: 2,
      itemGapLines: 2,
      bulletIndent: 18,
      bulletHanging: 5,
      lineSpacingMultiple: 1.08,
    },
  },
  {
    id: "visualContain",
    label: "Visual contain",
    description: "Visual request contained inside the block.",
  },
  {
    id: "visualCover",
    label: "Visual cover",
    description: "Visual request may fill or bleed beyond the block.",
  },
  {
    id: "callout",
    label: "Callout",
    description: "Emphasized note or conclusion.",
    textStyle: {
      bodyFontSize: 17,
      lineSpacingMultiple: 1.12,
    },
  },
];

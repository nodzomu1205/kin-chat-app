export type PresentationTheme =
  | "business-clean"
  | "warm-minimal"
  | "executive-dark";

export type PresentationDensity =
  | "concise"
  | "standard"
  | "detailed"
  | "dense";

export type PresentationVisualType =
  | "none"
  | "photo"
  | "illustration"
  | "diagram"
  | "chart"
  | "table"
  | "placeholder";

export type PresentationVisualStatus =
  | "none"
  | "pending"
  | "auto"
  | "attached"
  | "generated";

export type PresentationMotherVisual = {
  type: PresentationVisualType;
  brief: string;
  assetId: string;
  status: PresentationVisualStatus;
};

export type PresentationMotherBody = {
  keyMessage: string;
  keyMessageFacts: string[];
  keyVisual: PresentationMotherVisual;
  keyVisualFacts: string[];
};

export type PresentationMotherSlide = {
  title: string;
  templateFrame: string;
  wallpaper: string;
  bodies: PresentationMotherBody[];
  script: string;
};

export type PresentationMotherSpec = {
  version: "0.2-mother";
  title: string;
  purpose: string;
  audience: string;
  language: "ja" | "en";
  density?: PresentationDensity;
  theme?: PresentationTheme;
  sourceIntent: string;
  slides: PresentationMotherSlide[];
};

export type BulletItem = {
  text: string;
  detail?: string;
  emphasis?: "normal" | "strong" | "muted";
};

export type ColumnContent = {
  heading: string;
  body?: string;
  bullets?: BulletItem[];
};

export type TitleSlide = {
  id?: string;
  type: "title";
  title: string;
  subtitle?: string;
  kicker?: string;
  presenter?: string;
  date?: string;
  notes?: string;
};

export type SectionSlide = {
  id?: string;
  type: "section";
  title: string;
  subtitle?: string;
  sectionNumber?: string;
  notes?: string;
};

export type BulletsSlide = {
  id?: string;
  type: "bullets";
  title: string;
  lead?: string;
  bullets: BulletItem[];
  takeaway?: string;
  notes?: string;
};

export type TwoColumnSlide = {
  id?: string;
  type: "twoColumn";
  title: string;
  lead?: string;
  left: ColumnContent;
  right: ColumnContent;
  takeaway?: string;
  notes?: string;
};

export type TableSlide = {
  id?: string;
  type: "table";
  title: string;
  lead?: string;
  columns: string[];
  rows: string[][];
  takeaway?: string;
  notes?: string;
};

export type ClosingSlide = {
  id?: string;
  type: "closing";
  title: string;
  message?: string;
  nextSteps?: string[];
  contact?: string;
  notes?: string;
};

export type SlideSpec =
  | TitleSlide
  | SectionSlide
  | BulletsSlide
  | TwoColumnSlide
  | TableSlide
  | ClosingSlide;

export type PresentationSpec = {
  version: "0.1";
  title: string;
  subtitle?: string;
  language?: "ja" | "en";
  audience?: string;
  purpose?: string;
  theme?: PresentationTheme;
  density?: PresentationDensity;
  slides: SlideSpec[];
};

export type PresentationPatchOperation =
  | {
      op: "updateDeck";
      title?: string;
      subtitle?: string;
      audience?: string;
      purpose?: string;
      theme?: PresentationTheme;
      density?: PresentationDensity;
    }
  | {
      op: "updateSlide";
      slideNumber: number;
      patch: Record<string, unknown>;
    }
  | {
      op: "replaceSlide";
      slideNumber: number;
      slide: SlideSpec;
    }
  | {
      op: "insertSlide";
      afterSlideNumber: number;
      slide: SlideSpec;
    }
  | {
      op: "deleteSlide";
      slideNumber: number;
    }
  | {
      op: "moveSlide";
      fromSlideNumber: number;
      toSlideNumber: number;
    };

export type PresentationPatch = {
  version: "0.1";
  description?: string;
  operations: PresentationPatchOperation[];
};

export type PresentationOutput = {
  id: string;
  format: "pptx";
  filename: string;
  path?: string;
  createdAt: string;
  slideCount: number;
};

export type PresentationLibraryPayload = {
  kind: "kin.presentation";
  version: "0.1";
  documentId: string;
  status: "draft" | "revised" | "rendered" | "failed";
  motherSpec?: PresentationMotherSpec;
  spec: PresentationSpec;
  patches: PresentationPatch[];
  outputs: PresentationOutput[];
  previewText: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

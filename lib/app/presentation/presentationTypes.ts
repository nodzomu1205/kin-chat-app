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
  generationPrompt: string;
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
  theme?: PresentationTheme;
  sourceIntent: string;
  slides: PresentationMotherSlide[];
};

export type InformationInventoryFact = {
  id: string;
  text: string;
  sourceHint: string;
};

export type InformationInventoryFactGroup = {
  id: string;
  label: string;
  factIds: string[];
};

export type PresentationInformationInventory = {
  version: "0.2-information-inventory";
  topic: string;
  language: "ja" | "en";
  rawFacts: InformationInventoryFact[];
  factGroups: InformationInventoryFactGroup[];
};

export type PresentationTone =
  | "educational"
  | "analytical"
  | "executive"
  | "narrative"
  | "persuasive";

export type PresentationStructureFlow =
  | "chronological"
  | "overview_to_detail"
  | "thesis_evidence"
  | "comparison"
  | "problem_solution";

export type PresentationVisualUse = "minimal" | "selective" | "frequent";

export type PresentationStrategy = {
  version: "0.1-presentation-strategy";
  title: string;
  purpose: string;
  audience: string;
  tone: PresentationTone;
  density: PresentationDensity;
  slideCountRange: {
    min: number;
    max: number;
    target: number;
  };
  selectedFactGroupIds: string[];
  factGroupPriority: Array<{
    factGroupId: string;
    priority: "must_use" | "should_use" | "optional";
    reason: string;
  }>;
  visualPolicy: {
    overallUse: PresentationVisualUse;
    mustVisualizeFactGroupIds: string[];
    avoidVisualFactGroupIds: string[];
    preferredVisualTypes: PresentationVisualType[];
    avoidVisualTypes: PresentationVisualType[];
    reason: string;
  };
  structurePolicy: {
    preferredFlow: PresentationStructureFlow;
    allowMultipleFactGroupsPerSlide: boolean;
    combineRelatedFactGroups: boolean;
    notes: string;
  };
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
  keyVisual?: string;
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
  layoutVariant?:
    | "textLeftVisualRight"
    | "visualLeftTextRight"
    | "visualHero";
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
  informationInventory?: PresentationInformationInventory;
  presentationStrategy?: PresentationStrategy;
  spec: PresentationSpec;
  patches: PresentationPatch[];
  outputs: PresentationOutput[];
  previewText: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

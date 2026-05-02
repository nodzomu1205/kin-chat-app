export type TaskType = "PREP_TASK" | "DEEPEN_TASK" | "FORMAT_TASK";

export type DataKind =
  | "knowledge_package"
  | "codebase_package"
  | "document_package"
  | "draft_text"
  | "mixed_package";

export type TaskPriority = "HIGH" | "MID" | "LOW";

export type TaskVisibility = "INTERNAL" | "USER_VISIBLE";

export type TaskResponseMode = "STRUCTURED_RESULT";

export type TaskRequest = {
  type: TaskType;
  taskId: string;
  dataKind: DataKind;
  goal: string;
  inputRef: string;
  inputSummary: string;
  constraints: string[];
  outputFormat: string;
  priority: TaskPriority;
  visibility: TaskVisibility;
  responseMode: TaskResponseMode;
  existingTitle?: string | null;
};

export type TaskResultStatus = "OK" | "PARTIAL" | "NEEDS_MORE";

export type TaskResult = {
  taskId: string;
  type: TaskType;
  status: TaskResultStatus;
  summary: string;
  keyPoints: string[];
  detailBlocks: {
    title: string;
    body: string[];
  }[];
  warnings: string[];
  missingInfo: string[];
  nextSuggestion: string[];
};

export type TaskSourceType =
  | "gpt_chat"
  | "file_ingest"
  | "web_search"
  | "manual_note"
  | "kin_message";

export type TaskSource = {
  id: string;
  type: TaskSourceType;
  label: string;
  content: string;
  createdAt: string;
};

export type SearchMode =
  | "normal"
  | "ai"
  | "integrated"
  | "youtube"
  | "ai_first"
  | "news"
  | "geo"
  | "travel"
  | "product"
  | "entity"
  | "evidence";

export type SearchEngine =
  | "google_search"
  | "google_ai_mode"
  | "google_news"
  | "google_maps"
  | "google_local"
  | "youtube_search"
  | "google_flights"
  | "google_hotels"
  | "google_shopping"
  | "amazon_search";

export type SearchSourceItem = {
  title: string;
  link: string;
  snippet?: string;
  sourceType?: string;
  publishedAt?: string;
  thumbnailUrl?: string;
  channelName?: string;
  duration?: string;
  viewCount?: string;
  videoId?: string;
};

export type SearchProductItem = {
  title: string;
  link?: string;
  price?: string;
  source?: string;
  rating?: number;
};

export type SearchLocalResultItem = {
  title: string;
  address?: string;
  link?: string;
  rating?: number;
  reviews?: number;
};

export type SearchFlightItem = {
  airline?: string;
  price?: string;
  departure?: string;
  arrival?: string;
  duration?: string;
};

export type SearchHotelItem = {
  title: string;
  link?: string;
  price?: string;
  rating?: number;
  location?: string;
};

export type SearchEntityProfile = {
  name?: string;
  description?: string;
  website?: string;
  notableFacts?: string[];
};

export type SearchContext = {
  id?: string;
  rawResultId: string;
  mode?: SearchMode;
  engine?: SearchEngine;
  engines?: SearchEngine[];
  seriesId?: string;
  continuationToken?: string;
  taskId?: string;
  actionId?: string;
  query: string;
  location?: string;
  goal?: string;
  outputMode?: "summary" | "summary_with_sources" | "raw_and_summary";
  summaryText?: string;
  aiSummary?: string;
  rawText: string;
  sources: SearchSourceItem[];
  products?: SearchProductItem[];
  localResults?: SearchLocalResultItem[];
  flights?: SearchFlightItem[];
  hotels?: SearchHotelItem[];
  entityProfile?: SearchEntityProfile;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type TaskDraftStatus =
  | "idle"
  | "prepared"
  | "deepened"
  | "formatted";

export type TaskDraftMode = "normal" | "presentation";

export type PresentationTaskPlan = {
  version: "0.1-presentation-task-plan";
  documentId?: string;
  title: string;
  sourceSummary: string;
  extractedItems: string[];
  strategyItems: string[];
  keyMessages: string[];
  slideItems: string[];
  deckFrame?: PresentationTaskDeckFrame;
  slideFrames: PresentationTaskSlideFrame[];
  slides: PresentationTaskSlidePlan[];
  missingInfo: string[];
  nextSuggestions: string[];
  latestPptx?: {
    filename: string;
    path: string;
    createdAt: string;
    slideCount: number;
  } | null;
  debug?: PresentationTaskPlanDebug;
  updatedAt: string;
};

export type PresentationTaskPlanDebug = {
  slideSource: "slideFrameJson" | "slideDesignJson" | "legacySlideText" | "none";
  slideJsonRaw: string[];
  slideJsonParsed: boolean;
  slideCount: number;
  generatedAt: string;
};

export type PresentationTaskMasterFrameId =
  | "plain"
  | "titleLineFooter"
  | "logoHeaderFooter"
  | "fullBleedVisual";

export type PresentationTaskBookendFrameId =
  | "titleCover"
  | "visualTitleCover"
  | "endSlide"
  | "summaryClosing";

export type PresentationTaskLayoutFrameId =
  | "singleCenter"
  | "titleBody"
  | "leftRight50"
  | "visualLeftTextRight"
  | "textLeftVisualRight"
  | "heroTopDetailsBottom"
  | "threeColumns"
  | "twoByTwoGrid";

export type PresentationTaskBlockStyleId =
  | "headlineCenter"
  | "textStackTopLeft"
  | "listCompact"
  | "visualContain"
  | "visualCover"
  | "callout";

export type PresentationTaskDeckFrame = {
  slideCount?: number;
  masterFrameId: PresentationTaskMasterFrameId;
  background?: string;
  wallpaper?: string;
  typography?: {
    fontFamily?: string;
    bodyScale?: number;
    itemScale?: number;
    preferUniformTextSize?: boolean;
    minBodyFontSize?: number;
    maxBodyFontSize?: number;
  };
  pageNumber?: {
    enabled: boolean;
    position?: "bottomRight" | "bottomCenter" | "bottomLeft";
    style?: string;
    scope?: "bodyOnly" | "allSlides";
  };
  openingSlide?: PresentationTaskBookendSlide;
  closingSlide?: PresentationTaskBookendSlide;
  logo?: {
    enabled: boolean;
    position?: "topRight" | "topLeft" | "bottomRight" | "bottomLeft";
    label?: string;
  };
};

export type PresentationTaskBookendSlide = {
  enabled: boolean;
  frameId: PresentationTaskBookendFrameId;
  title?: string;
  subtitle?: string;
  message?: string;
  kicker?: string;
  presenter?: string;
  date?: string;
  nextSteps?: string[];
  contact?: string;
  notes?: string;
  visualRequest?: PresentationTaskVisualRequest;
};

export type PresentationTaskVisualRequest = {
  type:
    | "none"
    | "photo"
    | "illustration"
    | "diagram"
    | "chart"
    | "map"
    | "iconSet"
    | "table";
  brief: string;
  prompt?: string;
  promptNote?: string;
  preferredImageId?: string;
  labels?: string[];
  asset?: {
    imageId?: string;
    mimeType: string;
    base64: string;
    alt?: string;
    sourcePromptHash?: string;
    widthPx?: number;
    heightPx?: number;
    aspectRatio?: number;
    orientation?: "landscape" | "portrait" | "square" | "unknown";
  };
  renderStyle?: {
    orientation?: "horizontal" | "vertical";
    showBrief?: boolean;
  };
};

export type PresentationTaskSlideBlock = {
  id: string;
  kind: "textStack" | "visual" | "list" | "callout";
  styleId: PresentationTaskBlockStyleId;
  heading?: string;
  text?: string;
  items?: string[];
  renderStyle?: {
    fontSize?: "small" | "standard" | "large" | "xlarge";
    itemFontSize?: "small" | "standard" | "large" | "xlarge";
    showHeading?: boolean;
    textStyle?: PresentationTaskTextStyle;
  };
  visualRequest?: PresentationTaskVisualRequest;
};

export type PresentationTaskTextStyle = {
  headingFontSize?: number;
  bodyFontSize?: number;
  itemFontSize?: number;
  headingGapLines?: number;
  bodyGapLines?: number;
  itemGapLines?: number;
  bulletIndent?: number;
  bulletHanging?: number;
  lineSpacingMultiple?: number;
};

export type PresentationTaskSlideFrame = {
  slideNumber: number;
  title: string;
  masterFrameId: PresentationTaskMasterFrameId;
  layoutFrameId: PresentationTaskLayoutFrameId;
  speakerIntent?: string;
  blocks: PresentationTaskSlideBlock[];
};

export type PresentationTaskSlidePlan = {
  slideNumber: number;
  sectionLabel: string;
  title: string;
  keyMessage: string;
  supportingInfo: string[];
  keyVisual: string;
  visualSupportingInfo: string[];
  placementComposition: string;
  layoutItems: PresentationTaskSlideLayoutItem[];
  structuredContent: PresentationTaskSlideStructuredContent;
};

export type PresentationTaskSlideLayoutItem = {
  region: string;
  text: string;
};

export type PresentationTaskSlideStructuredContent = {
  title: string;
  mainMessage: string;
  facts: string[];
  visual: {
    brief: string;
    supportingFacts: string[];
  };
  layout: {
    instruction: string;
    elements: PresentationTaskSlideLayoutItem[];
  };
};

export type TaskDraft = {
  id: string;
  taskId: string;
  slot: number;
  mode?: TaskDraftMode;

  title: string;
  userInstruction: string;
  body: string;
  searchContext: SearchContext | null;

  taskName: string;
  objective: string;
  prepText: string;
  deepenText: string;
  mergedText: string;
  kinTaskText: string;
  presentationPlan?: PresentationTaskPlan | null;
  taskTitleDebug?: {
    prompt: string;
    rawReply: string;
    parsed: unknown;
    adoptedTitle: string;
    additionalSource?: string;
    userInstruction?: string;
  } | null;

  status: TaskDraftStatus;
  sources: TaskSource[];
  updatedAt: string;
};

export function createTaskDraftId(): string {
  return "";
}

export function createDefaultTaskName(): string {
  return "";
}

export function createEmptyTaskDraft(): TaskDraft {
  return {
    id: "",
    taskId: "",
    slot: 1,
    mode: "normal",

    title: "",
    userInstruction: "",
    body: "",
    searchContext: null,

    taskName: "",
    objective: "",
    prepText: "",
    deepenText: "",
    mergedText: "",
    kinTaskText: "",
    presentationPlan: null,
    taskTitleDebug: null,
    status: "idle",
    sources: [],
    updatedAt: "",
  };
}

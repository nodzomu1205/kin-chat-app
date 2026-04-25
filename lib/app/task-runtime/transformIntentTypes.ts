import type { KinBlockMode } from "@/lib/app/kin-protocol/kinStructuredProtocol";

export type UsageSummary = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type TransformIntent = {
  mode: KinBlockMode;
  rawDirective: string;
  cleanedDirective: string;
  directiveLines: string[];
  extraDirectiveLines: string[];

  translateTo?: string;
  finalOutputLanguage?: string;
  summarize: boolean;
  bulletize: boolean;
  preserveAllText: boolean;
  exact: boolean;

  focusQuery?: string;
  extractOnly: boolean;
  includeTopics: string[];
  excludeTopics: string[];

  tone?: string;
  formality?: "very_formal" | "formal" | "neutral" | "casual" | "very_casual";
  dialect?: string;
  persona?: string;
  audience?: string;

  outputFormat?:
    | "plain_text"
    | "bullets"
    | "numbered_list"
    | "table"
    | "json"
    | "markdown";
  maxLength?: string;
  minLength?: string;
  structureHint?: string;
  keepQuotes: boolean;

  allowRevision: boolean;
  requireDifferentSelection: boolean;
  preferLatestMaterial: boolean;
};

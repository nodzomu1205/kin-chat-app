import type { TokenUsage } from "@/lib/app/gpt-memory/gptMemoryStateHelpers";

export type RagLibraryOrganizationGroup = {
  id: string;
  label: string;
  category: string;
  theme: string;
  documentType: string;
  entities: string[];
  documentIds: string[];
  sourceDocumentCount: number;
  sourceChunkCount: number;
  sourceTokenEstimate: number;
  suggestedChunkCount: number;
  targetTitle: string;
  rationale: string;
};

export type RagLibraryOrganizationAnalysisResult = {
  configured: boolean;
  documentsScanned: number;
  chunksScanned: number;
  sourceTokenEstimate: number;
  groups: RagLibraryOrganizationGroup[];
  usage?: TokenUsage;
};

export type RagLibraryOrganizedDocumentResult = {
  documentId: string;
  title: string;
  sourceDocumentCount: number;
  sourceChunkCount: number;
  sourceTokenEstimate: number;
  outputChunkCount: number;
  outputTokenEstimate: number;
  deletedSourceDocumentCount: number;
  usage?: TokenUsage;
};

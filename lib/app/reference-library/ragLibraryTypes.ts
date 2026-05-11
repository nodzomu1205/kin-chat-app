import { z } from "zod";

export const ragLibraryMetadataSchema = z
  .object({
    customer: z.string().optional(),
    product: z.string().optional(),
    supplier: z.string().optional(),
    category: z.string().optional(),
    documentType: z.string().optional(),
    date: z.string().optional(),
  })
  .passthrough();

export type RagLibraryMetadata = z.infer<typeof ragLibraryMetadataSchema>;

export type RagLibraryDocument = {
  libraryItemId: string;
  sourceId: string;
  itemType: "search" | "kin_created" | "ingested_file";
  artifactType?: string;
  title: string;
  summary: string;
  content: string;
  metadata: RagLibraryMetadata;
  contentHash: string;
};

export type RagLibraryChunk = {
  libraryItemId: string;
  chunkIndex: number;
  content: string;
  tokenEstimate: number;
  metadata: RagLibraryMetadata & {
    title: string;
    itemType: RagLibraryDocument["itemType"];
    artifactType?: string;
  };
};

export type RagLibrarySearchMatch = {
  chunkId?: string;
  documentId?: string;
  libraryItemId: string;
  sourceId?: string;
  title: string;
  itemType: RagLibraryDocument["itemType"];
  artifactType?: string;
  chunkIndex: number;
  content: string;
  similarity?: number;
  metadata?: RagLibraryMetadata;
};

export type RagLibraryStoredChunk = {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokenEstimate: number;
  metadata?: RagLibraryMetadata;
  createdAt?: string;
  updatedAt?: string;
};

export type RagLibraryStoredDocument = {
  id: string;
  libraryItemId: string;
  sourceId: string;
  itemType: RagLibraryDocument["itemType"];
  artifactType?: string;
  title: string;
  summary: string;
  metadata?: RagLibraryMetadata;
  contentHash: string;
  createdAt?: string;
  updatedAt?: string;
  chunks: RagLibraryStoredChunk[];
};

import {
  parsePresentationPayload,
} from "@/lib/app/presentation/presentationDocumentBuilders";
import type { PresentationLibraryPayload } from "@/lib/app/presentation/presentationTypes";
import type { ReferenceLibraryItem } from "@/types/chat";

export function findPresentationPayloadByDocumentId(args: {
  documentId: string;
  referenceLibraryItems: ReferenceLibraryItem[];
}): { payload: PresentationLibraryPayload; sourceId: string } | null {
  for (const item of args.referenceLibraryItems) {
    if (item.artifactType !== "presentation") continue;
    const payload = parsePresentationPayload(item.excerptText);
    if (payload?.documentId === args.documentId) {
      return {
        payload,
        sourceId: item.sourceId,
      };
    }
  }
  return null;
}

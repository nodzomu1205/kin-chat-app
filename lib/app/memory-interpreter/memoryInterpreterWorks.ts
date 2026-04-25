import type { Memory } from "@/lib/memory-domain/memory";
import {
  extractQuotedWorks,
  extractWorksByEntityFromTable,
} from "@/lib/app/memory-interpreter/memoryInterpreterListExtraction";

export function getActiveDocumentRecord(
  currentMemory: Memory,
  activeDocumentOverride?: Record<string, unknown> | null
) {
  if (activeDocumentOverride && typeof activeDocumentOverride === "object") {
    return activeDocumentOverride;
  }

  const activeDocument = currentMemory.lists?.activeDocument;
  if (activeDocument && typeof activeDocument === "object" && !Array.isArray(activeDocument)) {
    return activeDocument as Record<string, unknown>;
  }

  return null;
}

export function resolveActiveDocumentFields(
  currentMemory: Memory,
  activeDocumentOverride?: Record<string, unknown> | null
) {
  const activeDocument = getActiveDocumentRecord(currentMemory, activeDocumentOverride);

  return {
    activeDocument,
    activeDocumentTitle:
      activeDocument && typeof activeDocument.title === "string"
        ? activeDocument.title
        : "",
    activeDocumentExcerpt:
      activeDocument && typeof activeDocument.excerpt === "string"
        ? activeDocument.excerpt
        : "",
  };
}

export function resolveWorksByEntityState(params: {
  currentMemory: Memory;
  resolvedTopic?: string;
  topicSwitched: boolean;
  activeDocumentExcerpt: string;
  latestAssistantText: string;
  worksAllowed: boolean;
}) {
  const tableWorksByEntity = extractWorksByEntityFromTable(params.activeDocumentExcerpt);
  const quotedWorks = params.worksAllowed
    ? extractQuotedWorks(params.latestAssistantText)
    : [];

  const existingWorksByEntity =
    !params.topicSwitched &&
    params.currentMemory.lists?.worksByEntity &&
    typeof params.currentMemory.lists.worksByEntity === "object" &&
    !Array.isArray(params.currentMemory.lists.worksByEntity)
      ? (params.currentMemory.lists.worksByEntity as Record<string, unknown>)
      : {};

  const mergedTopicWorks =
    params.resolvedTopic
      ? Array.from(
          new Set([
            ...(((existingWorksByEntity as Record<string, unknown> | undefined)?.[
              params.resolvedTopic
            ] as string[]) || []),
            ...(tableWorksByEntity[params.resolvedTopic] || []),
            ...quotedWorks,
          ])
        ).slice(-8)
      : [];

  const mergedQuotedWorks =
    params.resolvedTopic && mergedTopicWorks.length > 0
      ? {
          [params.resolvedTopic]: mergedTopicWorks,
        }
      : {};

  const worksByEntity =
    Object.keys(tableWorksByEntity).length > 0
      ? {
          ...existingWorksByEntity,
          ...tableWorksByEntity,
          ...mergedQuotedWorks,
        }
      : Object.keys(mergedQuotedWorks).length > 0
        ? {
            ...existingWorksByEntity,
            ...mergedQuotedWorks,
          }
        : undefined;

  return {
    tableWorksByEntity,
    quotedWorks,
    worksByEntity,
  };
}

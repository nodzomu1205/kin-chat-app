import type { Memory } from "@/lib/memory";
import { buildTrackedEntities } from "@/lib/app/memoryInterpreterFacts";
import { resolveWorksByEntityState } from "@/lib/app/memoryInterpreterWorks";

const LITERATURE_HINT_RE =
  /(?:文学|小説|作品|作家|詩人|評論家|代表作|人物|映画|チェーホフ|ドストエフスキー|トルストイ|プーシキン|ナポレオン)/u;

export function buildMemoryStateAssemblyLists(args: {
  currentMemory: Memory;
  resolvedTopic?: string;
  topicSwitched: boolean;
  activeDocument: Record<string, unknown> | null;
  activeDocumentTitle: string;
  activeDocumentExcerpt: string;
  latestAssistantText: string;
  recentSearchQueries: string[];
  trackedEntityOverride?: string;
}) {
  const worksAllowed = LITERATURE_HINT_RE.test(
    `${args.resolvedTopic || ""} ${args.activeDocumentTitle} ${args.latestAssistantText}`
  );
  const { tableWorksByEntity, worksByEntity } = resolveWorksByEntityState({
    currentMemory: args.currentMemory,
    resolvedTopic: args.resolvedTopic,
    topicSwitched: args.topicSwitched,
    activeDocumentExcerpt: args.activeDocumentExcerpt,
    latestAssistantText: args.latestAssistantText,
    worksAllowed,
  });

  const lists: Record<string, unknown> = {};
  if (args.activeDocument) lists.activeDocument = args.activeDocument;
  if (args.recentSearchQueries.length > 0) {
    lists.recentSearchQueries = args.recentSearchQueries;
  }

  const trackedEntities = buildTrackedEntities(
    args.currentMemory,
    args.trackedEntityOverride || args.resolvedTopic,
    tableWorksByEntity,
    args.topicSwitched
  );
  if (trackedEntities.length > 0) lists.trackedEntities = trackedEntities;
  if (worksByEntity && Object.keys(worksByEntity).length > 0) {
    lists.worksByEntity = worksByEntity;
  }

  return lists;
}

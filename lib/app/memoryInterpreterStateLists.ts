import type { Memory } from "@/lib/memory";
import { buildTrackedEntities } from "@/lib/app/memoryInterpreterFacts";
import { resolveWorksByEntityState } from "@/lib/app/memoryInterpreterWorks";

const LITERATURE_HINT_RE =
  /(?:譁・ｭｦ|菴懷ｮｶ|菴懷刀|蟆剰ｪｬ|謌ｯ譖ｲ|隧ｩ莠ｺ|莉｣陦ｨ菴忿蜈・ｸ･|莠ｺ迚ｩ|豁ｴ蜿ｲ|繝√ぉ繝ｼ繝帙ヵ|繝峨せ繝医お繝輔せ繧ｭ繝ｼ|繝医Ν繧ｹ繝医う|繝励・繧ｷ繧ｭ繝ｳ|繝翫・繝ｬ繧ｪ繝ｳ)/u;

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

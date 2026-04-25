import type { Memory } from "@/lib/memory-domain/memory";
import {
  extractFacts,
  extractPreferences,
  pruneFactsForTopic,
} from "@/lib/app/memory-interpreter/memoryInterpreterFacts";
import { buildResolvedTopicContextState } from "@/lib/app/memory-interpreter/memoryInterpreterContextReducer";
import { buildMemoryStateAssemblyInputs } from "@/lib/app/memory-interpreter/memoryInterpreterStateInputs";
import { buildMemoryStateAssemblyLists } from "@/lib/app/memory-interpreter/memoryInterpreterStateLists";
import type { Message } from "@/types/chat";
import type { MemoryInterpreterOptions } from "@/lib/app/memory-interpreter/memoryInterpreter";

export { buildMemoryStateAssemblyInputs } from "@/lib/app/memory-interpreter/memoryInterpreterStateInputs";
export { buildMemoryStateAssemblyLists } from "@/lib/app/memory-interpreter/memoryInterpreterStateLists";

export function buildInterpretedMemoryState(args: {
  currentMemory: Memory;
  recentMessages: Message[];
  options?: MemoryInterpreterOptions;
}) {
  const inputs = buildMemoryStateAssemblyInputs(args);
  const lists = buildMemoryStateAssemblyLists({
    currentMemory: args.currentMemory,
    resolvedTopic: inputs.resolvedTopic,
    topicSwitched: inputs.topicSwitched,
    activeDocument: inputs.activeDocument,
    activeDocumentTitle: inputs.activeDocumentTitle,
    activeDocumentExcerpt: inputs.activeDocumentExcerpt,
    latestAssistantText: inputs.latestAssistantText,
    recentSearchQueries: inputs.recentSearchQueries,
    trackedEntityOverride: args.options?.topicAdjudication?.trackedEntityOverride,
  });

  return {
    facts:
      inputs.closingOnlyTurn && !inputs.topicSwitched
        ? args.currentMemory.facts
        : pruneFactsForTopic(
            args.currentMemory.facts,
            extractFacts(inputs.factSourceMessages),
            inputs.topicSwitched
          ),
    preferences: extractPreferences(args.recentMessages),
    lists,
    context: buildResolvedTopicContextState({
      currentContext: args.currentMemory.context,
      resolvedTopic: inputs.resolvedTopic,
      inputText: inputs.latestPrompt,
      currentTaskTitleOverride: args.options?.currentTaskTitleOverride,
      lastUserIntentOverride:
        args.options?.lastUserIntent ||
        inputs.latestPrompt ||
        args.currentMemory.context.lastUserIntent,
      proposedTopic: args.options?.topicAdjudication?.proposedTopic,
    }),
  };
}

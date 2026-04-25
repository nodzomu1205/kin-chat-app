import type { Memory } from "@/lib/memory";
import {
  normalizeText,
  shouldPreserveExistingTopic,
} from "@/lib/app/memory-interpreter/memoryInterpreterText";
import {
  buildFollowUpRule,
  buildGoal,
} from "@/lib/app/memory-interpreter/memoryInterpreterContextPhrasing";

export function normalizeMemoryContextState(
  context: Memory["context"] | undefined
): Memory["context"] {
  const source = context || {};

  return {
    currentTopic:
      typeof source.currentTopic === "string"
        ? normalizeText(source.currentTopic)
        : undefined,
    proposedTopic:
      typeof source.proposedTopic === "string"
        ? normalizeText(source.proposedTopic)
        : undefined,
    currentTask:
      typeof source.currentTask === "string"
        ? normalizeText(source.currentTask)
        : undefined,
    followUpRule:
      typeof source.followUpRule === "string"
        ? normalizeText(source.followUpRule)
        : undefined,
    lastUserIntent:
      typeof source.lastUserIntent === "string"
        ? normalizeText(source.lastUserIntent)
        : undefined,
  };
}

export function stabilizeMemoryContextState(params: {
  candidateContext: Memory["context"];
  mergedContext: Memory["context"];
  latestMeaningfulUserText?: string;
}): Memory["context"] {
  const candidateContext = normalizeMemoryContextState(params.candidateContext);
  const mergedContext = normalizeMemoryContextState(params.mergedContext);
  const latestMeaningfulUserText = normalizeText(
    params.latestMeaningfulUserText || ""
  );

  return {
    ...mergedContext,
    currentTopic: candidateContext.currentTopic,
    proposedTopic: candidateContext.proposedTopic,
    currentTask: candidateContext.currentTask,
    followUpRule: candidateContext.followUpRule,
    lastUserIntent:
      latestMeaningfulUserText ||
      candidateContext.lastUserIntent,
  };
}

export function buildResolvedTopicContextState(params: {
  currentContext: Memory["context"];
  resolvedTopic?: string;
  inputText?: string;
  currentTaskTitleOverride?: string;
  lastUserIntentOverride?: string;
  proposedTopic?: string;
}): Memory["context"] {
  const normalizedCurrentContext = normalizeMemoryContextState(params.currentContext);
  const normalizedInput = normalizeText(params.inputText || "");
  const normalizedTaskTitleOverride = normalizeText(
    params.currentTaskTitleOverride || ""
  );
  const resolvedTopic = normalizeText(
    params.resolvedTopic || normalizedCurrentContext.currentTopic || ""
  );
  const resolvedLastIntent = params.lastUserIntentOverride
    ? normalizeText(params.lastUserIntentOverride)
    : shouldPreserveExistingTopic(normalizedInput)
      ? normalizedCurrentContext.lastUserIntent
      : normalizedInput || normalizedCurrentContext.lastUserIntent;

  return {
    currentTopic: resolvedTopic || undefined,
    proposedTopic:
      typeof params.proposedTopic === "string"
        ? normalizeText(params.proposedTopic)
        : undefined,
    currentTask:
      normalizedTaskTitleOverride ||
      buildGoal(resolvedTopic || undefined, normalizedCurrentContext.currentTask),
    followUpRule: buildFollowUpRule(
      resolvedTopic || undefined,
      normalizedCurrentContext.followUpRule
    ),
    lastUserIntent: resolvedLastIntent,
  };
}

export function applyCommittedTopicContext(
  context: Memory["context"],
  approvedTopic: string
): Memory["context"] {
  const nextTopic = normalizeText(approvedTopic);
  const normalizedContext = normalizeMemoryContextState(context);

  return {
    ...normalizedContext,
    currentTopic: nextTopic || undefined,
    proposedTopic: undefined,
    currentTask: buildGoal(nextTopic || undefined, normalizedContext.currentTask),
    followUpRule: buildFollowUpRule(nextTopic || undefined, normalizedContext.followUpRule),
    lastUserIntent: normalizedContext.lastUserIntent,
  };
}

export function buildRejectedReapplyContext(
  context: Memory["context"]
): Memory["context"] {
  const normalizedContext = normalizeMemoryContextState(context);

  return {
    currentTopic: undefined,
    proposedTopic: undefined,
    currentTask: undefined,
    followUpRule: undefined,
    lastUserIntent: normalizedContext.lastUserIntent,
  };
}

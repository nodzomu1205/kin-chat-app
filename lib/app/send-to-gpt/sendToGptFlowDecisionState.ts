export type SendToGptFlowStartDecision =
  | {
      type: "skip";
    }
  | {
      type: "run";
      rawText: string;
    };

export function resolveSendToGptFlowStart(params: {
  gptInput: string;
  gptLoading: boolean;
}): SendToGptFlowStartDecision {
  const rawText = params.gptInput.trim();
  if (!rawText || params.gptLoading) {
    return { type: "skip" };
  }

  return {
    type: "run",
    rawText,
  };
}

export type PrePreparationGateDecision =
  | {
      type: "multipart_import";
    }
  | {
      type: "inline_url";
      inlineUrlTarget: string;
    }
  | {
      type: "none";
    };

export function resolvePrePreparationGateDecision(params: {
  multipartHandled: boolean;
  inlineUrlTarget: string | null;
}): PrePreparationGateDecision {
  if (params.multipartHandled) {
    return { type: "multipart_import" };
  }

  if (params.inlineUrlTarget) {
    return {
      type: "inline_url",
      inlineUrlTarget: params.inlineUrlTarget,
    };
  }

  return { type: "none" };
}

export type PreparedRequestGateDecision =
  | {
      type: "task_directive_only";
    }
  | {
      type: "protocol_limit_violation";
      violationText: string;
    }
  | {
      type: "youtube_transcript";
    }
  | {
      type: "none";
    };

export function resolvePreparedRequestGateDecision(params: {
  isTaskDirectiveOnly: boolean;
  limitViolation: string | null;
  youtubeTranscriptUrl?: string;
}): PreparedRequestGateDecision {
  if (params.isTaskDirectiveOnly) {
    return { type: "task_directive_only" };
  }

  if (params.limitViolation) {
    return {
      type: "protocol_limit_violation",
      violationText: params.limitViolation,
    };
  }

  if (params.youtubeTranscriptUrl?.trim()) {
    return { type: "youtube_transcript" };
  }

  return { type: "none" };
}

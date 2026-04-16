"use client";

import { useChatPagePanelsComposition } from "@/hooks/useChatPagePanelsComposition";
import type { ChatPagePanelsViewArgs } from "@/hooks/chatPageCompositionTypes";
import { buildStoredDocumentFromTaskDraft } from "@/lib/app/taskDraftLibrary";

export function useChatPagePanelsView(args: ChatPagePanelsViewArgs): {
  kinPanel: React.ReactElement;
  gptPanel: React.ReactElement;
} {
  const handleSaveTaskSnapshot = () => {
    const nextDocument = buildStoredDocumentFromTaskDraft(
      args.taskSnapshot.currentTaskDraft
    );
    if (!nextDocument) return;
    args.taskSnapshot.recordIngestedDocument(nextDocument);
  };

  const { kinPanel, gptPanel } = useChatPagePanelsComposition({
    controller: args.controller,
    kinPanel: {
      ...args.kinPanel,
      app: args.panelApp,
      taskProtocolView: args.taskProtocolView,
    },
    gptPanel: {
      ...args.gptPanel,
      app: args.panelApp,
      taskProtocolView: args.taskProtocolView,
      task: {
        ...args.gptPanel.task,
        onSaveTaskSnapshot: handleSaveTaskSnapshot,
      },
    },
  });

  return {
    kinPanel,
    gptPanel,
  };
}

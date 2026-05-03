"use client";

import React from "react";
import {
  approvePptDirectEditCandidate,
  deleteApprovedPptDirectEdit,
  loadApprovedPptDirectEdits,
  loadPendingPptDirectEditCandidates,
  PPT_DIRECT_EDIT_APPROVAL_EVENT,
  rejectPptDirectEditCandidate,
  materializePptDirectEditCandidate,
  updatePendingPptDirectEditCandidate,
  type ApprovedPptDirectEdit,
  type PptDirectEditCandidatePatch,
  type PptDirectEditCandidate,
} from "@/lib/app/presentation/presentationDirectEditApproval";

export function usePptDirectEditApprovals() {
  const [pending, setPending] = React.useState<PptDirectEditCandidate[]>([]);
  const [approved, setApproved] = React.useState<ApprovedPptDirectEdit[]>([]);

  const reload = React.useCallback(() => {
    const storage = typeof window === "undefined" ? null : window.localStorage;
    setPending(loadPendingPptDirectEditCandidates(storage));
    setApproved(loadApprovedPptDirectEdits(storage));
  }, []);

  React.useEffect(() => {
    reload();
    if (typeof window === "undefined") return;
    window.addEventListener(PPT_DIRECT_EDIT_APPROVAL_EVENT, reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener(PPT_DIRECT_EDIT_APPROVAL_EVENT, reload);
      window.removeEventListener("storage", reload);
    };
  }, [reload]);

  return {
    pending,
    approved,
    approve: async (
      candidateId: string,
      options?: { apply?: (candidate: PptDirectEditCandidate) => Promise<void> }
    ) => {
      const storage = typeof window === "undefined" ? null : window.localStorage;
      const candidate = loadPendingPptDirectEditCandidates(storage).find(
        (item) => item.id === candidateId
      );
      if (!candidate) return;
      await options?.apply?.(materializePptDirectEditCandidate(candidate));
      approvePptDirectEditCandidate({
        storage: typeof window === "undefined" ? null : window.localStorage,
        candidateId,
      });
    },
    update: (candidateId: string, patch: PptDirectEditCandidatePatch) =>
      updatePendingPptDirectEditCandidate({
        storage: typeof window === "undefined" ? null : window.localStorage,
        candidateId,
        patch,
      }),
    reject: (candidateId: string) =>
      rejectPptDirectEditCandidate({
        storage: typeof window === "undefined" ? null : window.localStorage,
        candidateId,
      }),
    deleteApproved: (approvedId: string) =>
      deleteApprovedPptDirectEdit({
        storage: typeof window === "undefined" ? null : window.localStorage,
        approvedId,
      }),
  };
}

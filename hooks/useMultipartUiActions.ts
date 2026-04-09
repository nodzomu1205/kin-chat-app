import { useCallback } from "react";
import { generateId } from "@/lib/uuid";
import {
  processMultipartTaskDoneText as processMultipartTaskDoneTextBase,
  type TaskCharConstraint,
} from "@/lib/app/multipartAssemblyFlow";
import type { Message, MultipartAssembly } from "@/types/chat";

export function useMultipartUiActions(args: {
  multipartAssemblies: MultipartAssembly[];
  setMultipartAssemblies: React.Dispatch<React.SetStateAction<MultipartAssembly[]>>;
  currentTaskId: string | undefined;
  getCurrentTaskCharConstraint: () => TaskCharConstraint | null;
  setKinInput: React.Dispatch<React.SetStateAction<string>>;
  setGptMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setFinalizeReviewed: (params: { accepted: boolean; summary?: string }) => void;
  isMobile: boolean;
  setActiveTab: React.Dispatch<React.SetStateAction<"kin" | "gpt">>;
  loadMultipartAssemblyText: (assemblyId: string) => string;
  getMultipartAssembly: (assemblyId: string) => MultipartAssembly | null;
  setGptInput: React.Dispatch<React.SetStateAction<string>>;
}) {
  const processMultipartTaskDoneText = useCallback(
    (text: string, options?: { setGptTab?: boolean }) => {
      const result = processMultipartTaskDoneTextBase({
        text,
        assemblies: args.multipartAssemblies,
        currentTaskId: args.currentTaskId,
        constraint: args.getCurrentTaskCharConstraint(),
      });
      if (!result) return null;

      if (result.assembliesChanged) {
        args.setMultipartAssemblies(result.assemblies);
      }
      if (result.ack) {
        args.setKinInput(result.ack);
      }
      if (result.message) {
        args.setGptMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "gpt",
            text: result.message,
            meta: {
              kind: "task_info",
              sourceType: "kin_message",
            },
          },
        ]);
      }
      if (result.validationSummary) {
        args.setFinalizeReviewed({
          accepted: result.accepted,
          summary: result.validationSummary,
        });
      }
      if (options?.setGptTab && args.isMobile) args.setActiveTab("gpt");
      return { handled: true, accepted: result.accepted };
    },
    [args]
  );

  const loadMultipartAssemblyToGptInput = useCallback(
    (assemblyId: string) => {
      const text = args.loadMultipartAssemblyText(assemblyId);
      if (!text) return;
      args.setGptInput(text);
      if (args.isMobile) args.setActiveTab("gpt");
    },
    [args]
  );

  const downloadMultipartAssembly = useCallback(
    (assemblyId: string) => {
      const assembly = args.getMultipartAssembly(assemblyId);
      if (!assembly || typeof window === "undefined") return;
      const blob = new Blob([assembly.assembledText], {
        type: "text/plain;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = assembly.filename;
      anchor.click();
      window.URL.revokeObjectURL(url);
    },
    [args]
  );

  return {
    processMultipartTaskDoneText,
    loadMultipartAssemblyToGptInput,
    downloadMultipartAssembly,
  };
}

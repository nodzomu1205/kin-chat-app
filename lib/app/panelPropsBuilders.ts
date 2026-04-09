import type { KinPanelProps } from "@/components/panels/kin/kinPanelTypes";
import type { GptPanelProps } from "@/components/panels/gpt/gptPanelTypes";

export function buildKinPanelProps(args: KinPanelProps): KinPanelProps {
  return args;
}

type BuildGptPanelArgs = Omit<GptPanelProps, "onAnswerTaskRequest"> & {
  pendingRequests: Array<{ id: string; actionId: string; body: string }>;
  buildTaskRequestAnswerDraft: (
    requestId: string,
    requestBody?: string | null
  ) => string;
  setGptInput: (value: string) => void;
};

export function buildGptPanelProps(args: BuildGptPanelArgs): GptPanelProps {
  return {
    ...args,
    onAnswerTaskRequest: (requestId) => {
      const request =
        args.pendingRequests.find(
          (item) => item.id === requestId || item.actionId === requestId
        ) || null;
      args.setGptInput(args.buildTaskRequestAnswerDraft(requestId, request?.body));
    },
  };
}

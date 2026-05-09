import { generateId } from "@/lib/shared/uuid";
import type { SendToGptFlowStepArgs } from "@/lib/app/send-to-gpt/sendToGptFlowStepBuilders";
import type { Message } from "@/types/chat";
import type { PresentationTaskPlan } from "@/types/task";

export function appendPresentationAssistantMessage(args: {
  flowArgs: SendToGptFlowStepArgs;
  text: string;
  presentationPlan?: PresentationTaskPlan;
}) {
  const message = createPresentationAssistantMessage({
    text: args.text,
    presentationPlan: args.presentationPlan,
  });
  appendPresentationAssistantMessageToSetter({
    setGptMessages: args.flowArgs.setGptMessages,
    message,
  });
  const currentRecent = args.flowArgs.gptStateRef.current.recentMessages || [];
  const recentLimit = args.flowArgs.chatRecentLimit || 20;
  args.flowArgs.gptStateRef.current = {
    ...args.flowArgs.gptStateRef.current,
    recentMessages: [...currentRecent, message].slice(-recentLimit),
  };
}

function appendPresentationAssistantMessageToSetter(args: {
  setGptMessages: SendToGptFlowStepArgs["setGptMessages"];
  message: Message;
}) {
  args.setGptMessages((prev) => [...prev, args.message]);
}

function createPresentationAssistantMessage(args: {
  text: string;
  presentationPlan?: PresentationTaskPlan;
}): Message {
  return {
    id: generateId(),
    role: "gpt",
    text: args.text,
    meta: args.presentationPlan
      ? {
          kind: "task_info",
          sourceType: "manual",
          presentationPlan: args.presentationPlan,
        }
      : undefined,
  };
}

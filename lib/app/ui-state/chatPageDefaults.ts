import type { KinProfile } from "@/types/chat";
import type { ChatBridgeSettings } from "@/types/taskProtocol";

export const CHAT_PAGE_MOBILE_BREAKPOINT = 1180;

export const DEFAULT_CHAT_BRIDGE_SETTINGS: ChatBridgeSettings = {
  injectTaskContextOnReference: true,
  alwaysShowCurrentTaskInChatContext: false,
};

export function resolveCurrentKinDisplayLabel(args: {
  kinList: KinProfile[];
  currentKin: string | null;
}) {
  return args.kinList.find((kin) => kin.id === args.currentKin)?.label ?? null;
}

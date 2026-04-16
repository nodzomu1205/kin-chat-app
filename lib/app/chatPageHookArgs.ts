import type { ChatPageLifecycleArgs } from "@/hooks/useChatPageLifecycle";
import type { MultipartUiActionArgs } from "@/hooks/useMultipartUiActions";
import type { StoredDocumentUiActionArgs } from "@/hooks/useStoredDocumentUiActions";

export function buildChatPageLifecycleArgs(
  args: ChatPageLifecycleArgs
): ChatPageLifecycleArgs {
  return args;
}

export function buildMultipartUiActionArgs(
  args: MultipartUiActionArgs
): MultipartUiActionArgs {
  return args;
}

export function buildStoredDocumentUiActionArgs(
  args: StoredDocumentUiActionArgs
): StoredDocumentUiActionArgs {
  return args;
}

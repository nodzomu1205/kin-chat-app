import type { Message } from "@/types/chat";

const GPT_STATUS_PATTERNS = [
  /^No recent GPT response was found to send to Kin\.$/u,
  /^The latest GPT response is ready to transfer to Kin\.$/u,
  /^Latest GPT content was /u,
  /^Current (?:instruction|task content) was /u,
  /^Transforming the latest GPT response for Kin failed\./u,
  /^Transforming the current task for Kin failed\./u,
  /^Google Drive upload(?:ed| cancelled| failed)/u,
  /^Google Drive import failed:/u,
  /^Google Driveファイルをライブラリに保存しました:/u,
  /^Task preparation failed\.$/u,
  /^Task update failed\.$/u,
  /^Updating the task from the latest GPT message failed\.$/u,
  /^No current task content was found to update\.$/u,
  /^No current task content was found to send to Kin\.$/u,
  /^YouTube の文字起こしをライブラリに保存しました:/u,
  /^YouTube の文字起こし取込に失敗しました。?$/u,
  /^YouTube の文字起こしを Kin 送付用に整形できませんでした。?$/u,
];

export function isLatestGptStatusMessage(message: Message) {
  if (message.role !== "gpt") return false;
  const text = typeof message.text === "string" ? message.text.trim() : "";
  if (!text) return true;

  if (
    message.meta?.kind === "task_info" &&
    message.meta?.sourceType === "gpt_chat"
  ) {
    return true;
  }

  return GPT_STATUS_PATTERNS.some((pattern) => pattern.test(text));
}

export function findLatestTransferableGptMessage(messages: Message[]) {
  return [...messages]
    .reverse()
    .find(
      (message) =>
        message.role === "gpt" &&
        typeof message.text === "string" &&
        message.text.trim() &&
        !isLatestGptStatusMessage(message)
    );
}

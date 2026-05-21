export type KinToKinMember = {
  id: string;
  label: string;
};

export type KinToKinTranscriptEntry = {
  id: string;
  from: string;
  to: string;
  text: string;
  count: number;
  maxCount: number;
  createdAt: string;
};

export function buildKinToKinStartBlock(args: {
  starter: string;
  partner: string;
  topic: string;
  maxCount: number;
}) {
  return [
    "<<SYS_KIN_TO_KIN_CHAT>>",
    `MAX_CHAT_COUNT: ${args.maxCount}`,
    `CHAT_MEMBERS: ${args.starter}, ${args.partner}`,
    `STARTER: ${args.starter}`,
    `TOPIC: ${args.topic}`,
    "INSTRUCTION:",
    "Send one message to your chat member. Reply only with:",
    `<<SYS_${args.starter}_TO_${args.partner}_CHAT>>`,
    "[YOUR MESSAGE]",
    `<<END_SYS_${args.starter}_TO_${args.partner}_CHAT>>`,
    "<<END_SYS_KIN_TO_KIN_CHAT>>",
  ].join("\n");
}

export function buildKinToKinRelayBlock(args: {
  from: string;
  to: string;
  message: string;
  topic: string;
  count: number;
  maxCount: number;
}) {
  return [
    `<<SYS_${args.from}_TO_${args.to}_CHAT>>`,
    `CHAT_COUNT: ${args.count}/${args.maxCount}`,
    `TOPIC: ${args.topic}`,
    "",
    args.message.trim(),
    "",
    `NOTICE: Reply with <<SYS_${args.to}_TO_${args.from}_CHAT>> only.`,
    `<<END_SYS_${args.from}_TO_${args.to}_CHAT>>`,
  ].join("\n");
}

export function buildKinToKinLimitNotice(args: {
  maxCount: number;
  topic: string;
}) {
  return [
    "<<SYS_INFO>>",
    "TITLE: Kin間チャット終了",
    "CONTENT:",
    `Kin間チャットは上限 ${args.maxCount} 回に到達したため終了しました。`,
    `TOPIC: ${args.topic}`,
    "<<END_SYS_INFO>>",
  ].join("\n");
}

export function parseKinToKinChatReply(
  text: string,
  expected: { from: string; to: string }
) {
  const escapedFrom = escapeRegExp(expected.from);
  const escapedTo = escapeRegExp(expected.to);
  const exact = new RegExp(
    `<<SYS_${escapedFrom}_TO_${escapedTo}_CHAT>>([\\s\\S]*?)<<END_SYS_${escapedFrom}_TO_${escapedTo}_CHAT>>`,
    "i"
  );
  const loose = /<<SYS_([^>]+?)_TO_([^>]+?)_CHAT>>([\s\S]*?)<<END_SYS_[^>]+?_TO_[^>]+?_CHAT>>/i;
  const match = text.match(exact);
  const looseMatch = match ? null : text.match(loose);
  const body = (match?.[1] || looseMatch?.[3] || text).trim();

  return {
    from: match ? expected.from : looseMatch?.[1]?.trim() || expected.from,
    to: match ? expected.to : looseMatch?.[2]?.trim() || expected.to,
    text: stripProtocolNoise(body),
    matchedProtocol: Boolean(match || looseMatch),
  };
}

export function buildKinToKinSummaryRequest(args: {
  topic: string;
  entries: KinToKinTranscriptEntry[];
}) {
  const lines = args.entries.map(
    (entry) =>
      `${entry.count}/${entry.maxCount} ${entry.from} -> ${entry.to}: ${entry.text}`
  );
  return [
    "以下のKin間チャットを要約してください。",
    `TOPIC: ${args.topic}`,
    "",
    lines.join("\n\n"),
  ].join("\n");
}

function stripProtocolNoise(text: string) {
  return text
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return (
        !/^CHAT_COUNT:/i.test(trimmed) &&
        !/^TOPIC:/i.test(trimmed) &&
        !/^FROM:/i.test(trimmed) &&
        !/^TO:/i.test(trimmed) &&
        !/^NOTICE:/i.test(trimmed)
      );
    })
    .join("\n")
    .trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

export type ParsedKinToKinChatReply = {
  from: string;
  to: string;
  text: string;
  matchedProtocol: boolean;
};

export type KinGroupChatRouteValidation =
  | {
      ok: true;
      from: string;
      to: string;
      text: string;
      recipient: KinToKinMember;
    }
  | {
      ok: false;
      reason: string;
    };

export const KIN_GROUP_CHAT_END_TOKEN = "**END THE CHAT**";

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

export function buildKinGroupChatStartBlock(args: {
  facilitator: string;
  participants: string[];
  topic: string;
  maxCount: number;
}) {
  return [
    "<<SYS_KIN_TO_KIN_CHAT>>",
    `MAX_CHAT_COUNT: ${args.maxCount}`,
    `CHAT_MEMBERS: ${args.participants.join(", ")}`,
    `STARTER: ${args.facilitator}`,
    `TOPIC: ${args.topic}`,
    "",
    "You are the facilitator of this Kin group chat.",
    "",
    "Participants:",
    ...formatKinGroupParticipantLines(args.facilitator, args.participants, {
      facilitatorIsYou: true,
    }),
    "",
    "Rules:",
    "- Choose exactly one next speaker from the participant list.",
    "- Your reply must use exactly this format:",
    `  <<SYS_${args.facilitator}_TO_[ChosenParticipantKinName]_CHAT>>`,
    "  [Your message to the chosen participant]",
    `  <<END_SYS_${args.facilitator}_TO_[ChosenParticipantKinName]_CHAT>>`,
    "- The chosen participant may not have seen the full conversation history.",
    "- Add brief context inside your message when it helps the chosen participant answer well.",
    "- If a participant asks another participant a question, you must coordinate it by choosing the next speaker yourself.",
    `- To end the chat, include ${KIN_GROUP_CHAT_END_TOKEN} in your message body.`,
    "",
    "Start the group chat now by choosing the first participant to speak.",
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

export function buildKinGroupChatRelayBlock(args: {
  facilitator: string;
  participants: string[];
  recipient: string;
  sender: string;
  message: string;
}) {
  const isFacilitatorRecipient = args.recipient === args.facilitator;
  if (isFacilitatorRecipient) {
    return [
      "System notice:",
      "You are the facilitator of this Kin group chat.",
      "",
      "Participants:",
      ...formatKinGroupParticipantLines(args.facilitator, args.participants, {
        facilitatorIsYou: true,
      }),
      "",
      "Rules:",
      "- Choose exactly one next speaker from the participant list.",
      "- Your reply must use exactly this format:",
      `  <<SYS_${args.facilitator}_TO_[ChosenParticipantKinName]_CHAT>>`,
      "  [Your message to the chosen participant]",
      `  <<END_SYS_${args.facilitator}_TO_[ChosenParticipantKinName]_CHAT>>`,
      "- The chosen participant may not have seen the full conversation history.",
      "- Add brief context inside your message when it helps the chosen participant answer well.",
      "- If the participant below asks another participant a question, you must coordinate it by choosing the next speaker yourself.",
      `- To end the chat, include ${KIN_GROUP_CHAT_END_TOKEN} in your message body.`,
      "",
      `Incoming message from ${args.sender}:`,
      args.message.trim(),
    ].join("\n");
  }

  return [
    "System notice:",
    "You are participating in a Kin group chat.",
    "",
    "Facilitator:",
    args.facilitator,
    "",
    "Participants:",
    ...formatKinGroupParticipantLines(args.facilitator, args.participants),
    "",
    "Rules:",
    `- Reply only to the facilitator, ${args.facilitator}.`,
    "- If you want another participant to answer something, ask the facilitator to pass it to them.",
    "- Your reply must use exactly this format:",
    `  <<SYS_${args.recipient}_TO_${args.facilitator}_CHAT>>`,
    "  [Your message to the facilitator]",
    `  <<END_SYS_${args.recipient}_TO_${args.facilitator}_CHAT>>`,
    "",
    "Incoming message from the facilitator:",
    args.message.trim(),
  ].join("\n");
}

export function buildKinGroupChatRetryBlock(args: {
  facilitator: string;
  participants: string[];
  sender: string;
  reason: string;
}) {
  const isFacilitator = args.sender === args.facilitator;
  if (isFacilitator) {
    return [
      "System notice:",
      "Your previous reply could not be relayed because its routing format was invalid.",
      "",
      "Reason:",
      args.reason,
      "",
      "Participants:",
      ...formatKinGroupParticipantLines(args.facilitator, args.participants, {
        facilitatorIsYou: true,
      }),
      "",
      "Rules:",
      "- Choose exactly one next speaker from the participant list.",
      "- Your reply must use exactly this format:",
      `  <<SYS_${args.facilitator}_TO_[ChosenParticipantKinName]_CHAT>>`,
      "  [Your message to the chosen participant]",
      `  <<END_SYS_${args.facilitator}_TO_[ChosenParticipantKinName]_CHAT>>`,
      "- Add brief context inside your message when it helps the chosen participant answer well.",
      `- To end the chat, include ${KIN_GROUP_CHAT_END_TOKEN} in your message body.`,
      "",
      "Please rewrite your previous message in the correct format.",
    ].join("\n");
  }

  return [
    "System notice:",
    "Your previous reply could not be relayed because its routing format was invalid.",
    "",
    "Reason:",
    args.reason,
    "",
    "Facilitator:",
    args.facilitator,
    "",
    "Participants:",
    ...formatKinGroupParticipantLines(args.facilitator, args.participants),
    "",
    "Rules:",
    `- Reply only to the facilitator, ${args.facilitator}.`,
    "- If you want another participant to answer something, ask the facilitator to pass it to them.",
    "- Your reply must use exactly this format:",
    `  <<SYS_${args.sender}_TO_${args.facilitator}_CHAT>>`,
    "  [Your message to the facilitator]",
    `  <<END_SYS_${args.sender}_TO_${args.facilitator}_CHAT>>`,
    "",
    "Please rewrite your previous message in the correct format.",
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
): ParsedKinToKinChatReply {
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

export function parseKinToKinProtocolBlock(
  text: string
): ParsedKinToKinChatReply {
  const loose = /<<SYS_([^>]+?)_TO_([^>]+?)_CHAT>>([\s\S]*?)<<END_SYS_[^>]+?_TO_[^>]+?_CHAT>>/i;
  const looseMatch = text.match(loose);
  const body = (looseMatch?.[3] || text).trim();

  return {
    from: looseMatch?.[1]?.trim() || "",
    to: looseMatch?.[2]?.trim() || "",
    text: stripProtocolNoise(body),
    matchedProtocol: Boolean(looseMatch),
  };
}

export function validateKinGroupChatRoute(args: {
  parsed: ParsedKinToKinChatReply;
  sender: KinToKinMember;
  facilitator: KinToKinMember;
  members: KinToKinMember[];
}): KinGroupChatRouteValidation {
  if (!args.parsed.matchedProtocol) {
    return { ok: false, reason: "The reply did not include a SYS chat block." };
  }
  if (args.parsed.from !== args.sender.label) {
    return {
      ok: false,
      reason: `The FROM name must be ${args.sender.label}.`,
    };
  }

  const recipient = args.members.find((member) => member.label === args.parsed.to);
  if (!recipient) {
    return {
      ok: false,
      reason: "The TO name did not match any group participant.",
    };
  }

  const senderIsFacilitator = args.sender.id === args.facilitator.id;
  if (senderIsFacilitator && recipient.id === args.facilitator.id) {
    return {
      ok: false,
      reason: "The facilitator must choose a participant as the next speaker.",
    };
  }
  if (!senderIsFacilitator && recipient.id !== args.facilitator.id) {
    return {
      ok: false,
      reason: `Participants must reply to the facilitator, ${args.facilitator.label}.`,
    };
  }

  return {
    ok: true,
    from: args.parsed.from,
    to: args.parsed.to,
    text: args.parsed.text,
    recipient,
  };
}

export function containsKinGroupChatEndToken(text: string) {
  return text.includes(KIN_GROUP_CHAT_END_TOKEN);
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

function formatKinGroupParticipantLines(
  facilitator: string,
  participants: string[],
  options?: { facilitatorIsYou?: boolean }
) {
  return participants.map((participant) => {
    if (participant !== facilitator) return `- ${participant}`;
    return options?.facilitatorIsYou
      ? `- ${participant} (facilitator, you)`
      : `- ${participant} (facilitator)`;
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

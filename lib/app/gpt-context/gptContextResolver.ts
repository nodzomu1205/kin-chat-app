function normalizeFreeText(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function stripLeadIn(text: string) {
  return normalizeFreeText(text)
    .replace(/^(?:はい|ええと|つまり|要するに|ちなみに|well|so)[、,\s]*/iu, "")
    .trim();
}

function stripTrailingPunctuation(text: string) {
  return text.replace(/[!！?？。.\s]+$/u, "").trim();
}

function isClosingText(text: string) {
  return /(?:ありがとう.*もう大丈夫|もう大丈夫|もういい|一旦いい|終わり|別件)/u.test(text);
}

function isWeakSurface(text: string) {
  return /^(?:それ|これ|あれ|なるほど|へー|ok|okay|thanks|thank you)$/iu.test(text);
}

function trimTopicCandidate(text: string) {
  return stripTrailingPunctuation(stripLeadIn(text));
}

export function normalizePromptTopic(text: string) {
  const normalized = normalizeFreeText(text).replace(/^user[:：]\s*/iu, "").trim();
  if (!normalized) return "";
  if (isClosingText(normalized)) return "";

  const stripped = stripLeadIn(normalized);

  const directPatterns = [
    /^(.+?)について(?:もっと|もう少し)?(?:詳しく|くわしく)?(?:教えて|知りたい|説明して)(?:ください|下さい)?/u,
    /^(.+?)のことを(?:もっと|もう少し)?(?:詳しく|くわしく)?(?:教えて|知りたい|説明して)(?:ください|下さい)?/u,
    /^(.+?)(?:って|とは)(?:何|なに|誰|だれ|どこ|いつ|どういうもの|どんなもの|何ですか)/u,
    /^(.+?)(?:は|って)?(?:本当|事実|正しい)(?:ですか|なの|なんですか)?/u,
  ];

  for (const pattern of directPatterns) {
    const match = stripped.match(pattern);
    if (!match?.[1]) continue;
    const candidate = trimTopicCandidate(match[1]);
    if (candidate && !isWeakSurface(candidate)) return candidate;
  }

  const candidate = trimTopicCandidate(stripped);
  if (!candidate || isWeakSurface(candidate)) return "";
  return candidate;
}

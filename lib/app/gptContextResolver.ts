function normalizeFreeText(text: string) {
  return text.normalize("NFKC").replace(/\s+/g, " ").trim();
}

function isDismissiveOrClosingText(text: string) {
  const normalized = normalizeFreeText(text);
  if (!normalized) return true;

  const phrases = [
    "もう大丈夫",
    "それでいい",
    "一旦いい",
    "大丈夫",
    "終了",
    "この話題は一旦いい",
    "この話題は一旦大丈夫",
    "もう十分",
    "ひとまずいい",
  ];

  return phrases.some((phrase) => normalized.includes(phrase));
}

function stripLeadIn(text: string) {
  return normalizeFreeText(text).replace(
    /^(?:ははは|うん|へー|へえそうなんです・?|なるほど|たしかに|確かに|ありがとう|ありがとう[、。\s]*)/iu,
    ""
  );
}

function trimTopicCandidate(value: string) {
  return stripLeadIn(value)
    .replace(/^(?:次は|次に|次の?)\s*/iu, "")
    .replace(/^(?:もっと詳しく|一番|いちばん有名な)[、。\s]*/iu, "")
    .replace(
      /(?:について|に関して|に関する|を中心に|のこと|って話とは話とは|って|して)[、。\s]*$/iu,
      ""
    )
    .replace(/[、。\s.!！?？]+$/gu, "")
    .trim();
}

export function normalizePromptTopic(text: string) {
  const normalized = normalizeFreeText(text).replace(/^検索[:：\s]*/iu, "").trim();
  if (!normalized) return "";
  if (isDismissiveOrClosingText(normalized)) return "";

  const strongPatterns: Array<[RegExp, number]> = [
    [/^(?:一番|いちばん有名なのは)?(.+?)(?:でしょうか)?[。.!！?？]*$/iu, 1],
    [/^(.+?)について(?:詳しく)?(?:教えて|知りたい|説明して)(?:ください|下さい)?[。.!！?？]*$/iu, 1],
    [/^(.+?)に関して(?:詳しく)?(?:教えて|知りたい|説明して)(?:ください|下さい)?[。.!！?？]*$/iu, 1],
    [/^(.+?)を(?:もっと)?(?:詳しく)?(?:教えて|知りたい|説明して)(?:ください|下さい)?[。.!！?？]*$/iu, 1],
    [/^(.+?)は(?:ありますか)?[。.!！?？]*$/iu, 1],
    [/^(.+?)って(?:何|誰)(?:ですか)?[。.!！?？]*$/iu, 1],
  ];

  const stripped = stripLeadIn(normalized);
  for (const [pattern, groupIndex] of strongPatterns) {
    const match = stripped.match(pattern);
    if (!match) continue;
    const candidate = trimTopicCandidate(match[groupIndex] || "");
    if (candidate && !isDismissiveOrClosingText(candidate)) return candidate;
  }

  const candidate = trimTopicCandidate(stripped);
  if (!candidate) return "";
  if (isDismissiveOrClosingText(candidate)) return "";
  if (/^(?:へー|なるほど|そうなんですね|それ|これ|あれ)$/u.test(candidate)) {
    return "";
  }

  if (
    /(?:ですか|ますか|でしょうか|ませんか)$/iu.test(candidate) ||
    candidate.includes("教えて")
  ) {
    return "";
  }

  return candidate;
}

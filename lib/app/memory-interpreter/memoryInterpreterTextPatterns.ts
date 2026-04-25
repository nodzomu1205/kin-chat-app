export const MEMORY_ACK_LEAD_IN_RE =
  /^(?:へー|なるほど|そうなんですね|そうなんだ|はい|うん|ああ|了解(?:です)?|わかりました|ありがとう(?:ございます)?)[、。\s!！?？]*/u;

export const MEMORY_CLAUSE_SEPARATOR_RE = /[。.!！?？]/u;
export const MEMORY_SENTENCE_MARK_RE = /[。.!！?？]/gu;

export function countMemorySentenceMarkers(text: string) {
  return (text.match(MEMORY_SENTENCE_MARK_RE) || []).length;
}

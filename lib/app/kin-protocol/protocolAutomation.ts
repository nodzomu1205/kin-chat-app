export function containsSysProtocolBlock(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return /<<SYS_[A-Z_]+>>[\s\S]*?<<END_SYS_[A-Z_]+>>/i.test(trimmed);
}

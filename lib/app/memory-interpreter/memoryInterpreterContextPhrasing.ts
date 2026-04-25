export function buildGoal(topic: string | undefined, fallback?: string) {
  if (topic) return `ユーザーは${topic}について知りたい`;
  return fallback;
}

export function buildFollowUpRule(topic: string | undefined, fallback?: string) {
  if (topic) {
    return `短い追質問は、直前の${topic}トピックを引き継いで解釈する`;
  }
  return fallback;
}

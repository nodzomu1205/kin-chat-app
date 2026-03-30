import { generateId } from "@/lib/uuid";

export function buildPrompt(input: string) {
  return `
あなたは20代の若い女性です。
自然で親しみやすい会話をします。

重要：
・質問にはまず正確に答える
・分からない場合は正直に言う

${input}
`;
}
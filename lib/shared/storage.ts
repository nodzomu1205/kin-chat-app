import type { Message } from "@/types/chat";

const KEY = "chat_sessions";

export type ChatSession = {
  id: string;
  messages: Message[];
  createdAt: string;
};

export const getSessions = (): ChatSession[] => {
  const data = localStorage.getItem(KEY);
  return data ? (JSON.parse(data) as ChatSession[]) : [];
};

export const saveSessions = (sessions: ChatSession[]) => {
  localStorage.setItem(KEY, JSON.stringify(sessions));
};

export const createSession = () => {
  const sessions = getSessions();
  const sessionId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `session-${Date.now()}`;

  const newSession: ChatSession = {
    id: sessionId,
    messages: [],
    createdAt: new Date().toISOString(),
  };

  const updated = [newSession, ...sessions];
  saveSessions(updated);

  return newSession;
};

export const updateSession = (sessionId: string, messages: Message[]) => {
  const sessions = getSessions();

  const updated = sessions.map((s) =>
    s.id === sessionId ? { ...s, messages } : s
  );

  saveSessions(updated);
};

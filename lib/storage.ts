import { generateId } from "@/lib/uuid";

const KEY = "chat_sessions";

export const getSessions = () => {
  const data = localStorage.getItem(KEY);
  return data ? JSON.parse(data) : [];
};

export const saveSessions = (sessions: any) => {
  localStorage.setItem(KEY, JSON.stringify(sessions));
};

export const createSession = () => {
  const sessions = getSessions();

  const newSession = {
    id: generateId(),
    messages: [],
    createdAt: new Date().toISOString(),
  };

  const updated = [newSession, ...sessions];
  saveSessions(updated);

  return newSession;
};

export const updateSession = (sessionId: string, messages: any[]) => {
  const sessions = getSessions();

  const updated = sessions.map((s: any) =>
    s.id === sessionId ? { ...s, messages } : s
  );

  saveSessions(updated);
};
import { useEffect } from "react";
import { createSession, getSessions } from "@/lib/storage";

export type ChatPageLifecycleArgs = {
  currentKin: string | null;
  ensureKinState: (kinId: string) => void;
  isMobile: boolean;
  setActiveTab: React.Dispatch<React.SetStateAction<"kin" | "gpt">>;
  setCurrentSessionId: React.Dispatch<React.SetStateAction<string | null>>;
};

export function useChatPageLifecycle({
  currentKin,
  ensureKinState,
  isMobile,
  setActiveTab,
  setCurrentSessionId,
}: ChatPageLifecycleArgs) {
  useEffect(() => {
    const sessions = getSessions();

    if (sessions.length === 0) {
      const newSession = createSession();
      setCurrentSessionId(newSession.id);
      return;
    }

    setCurrentSessionId(sessions[0].id);
  }, [setCurrentSessionId]);

  useEffect(() => {
    if (!currentKin) return;
    ensureKinState(currentKin);
  }, [currentKin, ensureKinState]);

  useEffect(() => {
    if (isMobile) {
      setActiveTab((prev) => (prev === "gpt" ? "gpt" : "kin"));
    }
  }, [isMobile, setActiveTab]);
}

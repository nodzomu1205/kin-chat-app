"use client";

import { useEffect, useState } from "react";
import type { KinProfile } from "@/types/chat";

type KinStatus = "idle" | "connected" | "error";

const KIN_LIST_KEY = "kin_list";
const CURRENT_KIN_KEY = "kin_current";
const KIN_STATUS_KEY = "kin_status";

const createKinLabel = (index: number) => `Kin ${index + 1}`;

const dedupeKinProfiles = (list: KinProfile[]) => {
  return list.filter(
    (item, index, array) => array.findIndex((x) => x.id === item.id) === index
  );
};

export function useKinManager() {
  const [kinIdInput, setKinIdInput] = useState("");
  const [kinNameInput, setKinNameInput] = useState("");
  const [kinList, setKinList] = useState<KinProfile[]>([]);
  const [currentKin, setCurrentKin] = useState<string | null>(null);
  const [kinStatus, setKinStatus] = useState<KinStatus>("idle");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const savedKinList = localStorage.getItem(KIN_LIST_KEY);
    const savedCurrentKin = localStorage.getItem(CURRENT_KIN_KEY);
    const savedStatus = localStorage.getItem(KIN_STATUS_KEY);

    if (!savedKinList) {
      setHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(savedKinList) as unknown;

      if (!Array.isArray(parsed)) {
        setHydrated(true);
        return;
      }

      const normalized: KinProfile[] = parsed
        .map((item, index) => {
          if (typeof item === "string") {
            const trimmed = item.trim();
            if (!trimmed) return null;

            return {
              id: trimmed,
              label: createKinLabel(index),
            };
          }

          if (
            item &&
            typeof item === "object" &&
            "id" in item &&
            typeof (item as { id: unknown }).id === "string"
          ) {
            const typed = item as { id: string; label?: unknown };
            const trimmedId = typed.id.trim();

            if (!trimmedId) return null;

            return {
              id: trimmedId,
              label:
                typeof typed.label === "string" && typed.label.trim()
                  ? typed.label.trim()
                  : createKinLabel(index),
            };
          }

          return null;
        })
        .filter((item): item is KinProfile => item !== null);

      const deduped = dedupeKinProfiles(normalized);
      setKinList(deduped);

      const hasSavedCurrentKin =
        typeof savedCurrentKin === "string" &&
        savedCurrentKin.trim() &&
        deduped.some((item) => item.id === savedCurrentKin);

      if (hasSavedCurrentKin) {
        setCurrentKin(savedCurrentKin);
        setKinStatus(savedStatus === "error" ? "error" : "connected");
      } else if (savedStatus === "idle") {
        setCurrentKin(null);
        setKinStatus("idle");
      } else if (deduped.length > 0) {
        setCurrentKin(deduped[0].id);
        setKinStatus("connected");
      } else {
        setCurrentKin(null);
        setKinStatus("idle");
      }
    } catch {
      console.warn("kin_list parse failed");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const deduped = dedupeKinProfiles(kinList);
    localStorage.setItem(KIN_LIST_KEY, JSON.stringify(deduped));
  }, [hydrated, kinList]);

  useEffect(() => {
    if (!hydrated) return;

    if (currentKin) {
      localStorage.setItem(CURRENT_KIN_KEY, currentKin);
    } else {
      localStorage.removeItem(CURRENT_KIN_KEY);
    }
  }, [currentKin, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KIN_STATUS_KEY, kinStatus);
  }, [hydrated, kinStatus]);

  const connectKin = () => {
    const trimmedId = kinIdInput.trim();
    const trimmedName = kinNameInput.trim();

    if (!trimmedId) return;

    setKinList((prev) => {
      const exists = prev.some((item) => item.id === trimmedId);
      if (exists) {
        return prev;
      }

      return [
        ...prev,
        {
          id: trimmedId,
          label: trimmedName || createKinLabel(prev.length),
        },
      ];
    });

    setCurrentKin(trimmedId);
    setKinStatus("connected");
    setKinIdInput("");
    setKinNameInput("");
  };

  const switchKin = (id: string) => {
    setCurrentKin(id);
    setKinStatus("connected");
  };

  const disconnectKin = () => {
    setCurrentKin(null);
    setKinStatus("idle");
  };

  const removeKin = (id: string) => {
    const nextList = kinList.filter((item) => item.id !== id);
    const deduped = dedupeKinProfiles(nextList);

    setKinList(deduped);

    if (currentKin === id) {
      setCurrentKin(null);
      setKinStatus("idle");
    }
  };

  const renameKin = (id: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setKinList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, label: trimmed } : item))
    );
  };

  return {
    kinIdInput,
    setKinIdInput,
    kinNameInput,
    setKinNameInput,
    kinList,
    currentKin,
    kinStatus,
    setKinStatus,
    connectKin,
    switchKin,
    disconnectKin,
    removeKin,
    renameKin,
  };
}

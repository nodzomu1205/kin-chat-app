"use client";

import { useEffect, useState } from "react";
import type { KinProfile } from "@/types/chat";
import { generateId } from "@/lib/uuid";

type KinStatus = "idle" | "connected" | "error";

const KIN_LIST_KEY = "kin_list";

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

  useEffect(() => {
    const savedKinList = localStorage.getItem(KIN_LIST_KEY);
    if (!savedKinList) return;

    try {
      const parsed = JSON.parse(savedKinList) as unknown;

      if (!Array.isArray(parsed)) return;

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

      if (deduped.length > 0) {
        setCurrentKin(deduped[0].id);
        setKinStatus("connected");
      }
    } catch {
      console.warn("kin_list parse failed");
    }
  }, []);

  useEffect(() => {
    const deduped = dedupeKinProfiles(kinList);
    localStorage.setItem(KIN_LIST_KEY, JSON.stringify(deduped));
  }, [kinList]);

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

  const removeKin = (id: string) => {
    const nextList = kinList.filter((item) => item.id !== id);
    const deduped = dedupeKinProfiles(nextList);

    setKinList(deduped);

    if (currentKin === id) {
      setCurrentKin(deduped[0]?.id ?? null);
      setKinStatus(deduped.length > 0 ? "connected" : "idle");
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
    removeKin,
    renameKin,
  };
}
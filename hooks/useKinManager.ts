"use client";

import { useEffect, useState } from "react";
import type { KinProfile } from "@/types/chat";

export type KinDisplayStatus = "idle" | "connected" | "error";
export type KinConnectionState = "idle" | "connected" | "error";
export type KinSelectionState = "none" | "selected";

const KIN_LIST_KEY = "kin_list";
const CURRENT_KIN_KEY = "kin_current";
const KIN_STATUS_KEY = "kin_status";
const SELECTED_KIN_IDS_KEY = "kin_selected_ids";

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
  const [selectedKinIds, setSelectedKinIds] = useState<string[]>([]);
  const [kinConnectionState, setKinConnectionState] =
    useState<KinConnectionState>("idle");
  const [hydrated, setHydrated] = useState(false);

  const kinSelectionState: KinSelectionState = currentKin ? "selected" : "none";
  const kinStatus: KinDisplayStatus =
    kinSelectionState === "none"
      ? "idle"
      : kinConnectionState === "error"
        ? "error"
        : "connected";

  useEffect(() => {
    const savedKinList = localStorage.getItem(KIN_LIST_KEY);
    const savedCurrentKin = localStorage.getItem(CURRENT_KIN_KEY);
    const savedSelectedKinIds = localStorage.getItem(SELECTED_KIN_IDS_KEY);
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
      const parsedSelectedKinIds = (() => {
        if (!savedSelectedKinIds) return [];
        try {
          const parsed = JSON.parse(savedSelectedKinIds) as unknown;
          if (!Array.isArray(parsed)) return [];
          return parsed.filter(
            (id): id is string =>
              typeof id === "string" && deduped.some((item) => item.id === id)
          );
        } catch {
          return [];
        }
      })();

      if (hasSavedCurrentKin) {
        setCurrentKin(savedCurrentKin);
        setSelectedKinIds(
          parsedSelectedKinIds.length > 0
            ? parsedSelectedKinIds
            : [savedCurrentKin]
        );
        setKinConnectionState(savedStatus === "error" ? "error" : "connected");
      } else if (savedStatus === "idle") {
        setCurrentKin(null);
        setSelectedKinIds(parsedSelectedKinIds);
        setKinConnectionState("idle");
      } else if (deduped.length > 0) {
        setCurrentKin(deduped[0].id);
        setSelectedKinIds(
          parsedSelectedKinIds.length > 0
            ? parsedSelectedKinIds
            : [deduped[0].id]
        );
        setKinConnectionState("connected");
      } else {
        setCurrentKin(null);
        setSelectedKinIds([]);
        setKinConnectionState("idle");
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
    setSelectedKinIds((prev) =>
      prev.filter((id) => deduped.some((item) => item.id === id))
    );
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
    localStorage.setItem(KIN_STATUS_KEY, kinConnectionState);
  }, [hydrated, kinConnectionState]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(SELECTED_KIN_IDS_KEY, JSON.stringify(selectedKinIds));
  }, [hydrated, selectedKinIds]);

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
    setSelectedKinIds([trimmedId]);
    setKinConnectionState("connected");
    setKinIdInput("");
    setKinNameInput("");
  };

  const switchKin = (id: string) => {
    if (currentKin === id) {
      setCurrentKin(null);
      setKinConnectionState("idle");
      return;
    }
    setCurrentKin(id);
    setKinConnectionState("connected");
  };

  const disconnectKin = () => {
    setCurrentKin(null);
    setSelectedKinIds([]);
    setKinConnectionState("idle");
  };

  const removeKin = (id: string) => {
    const nextList = kinList.filter((item) => item.id !== id);
    const deduped = dedupeKinProfiles(nextList);

    setKinList(deduped);

    if (currentKin === id) {
      setCurrentKin(null);
      setKinConnectionState("idle");
    }
    setSelectedKinIds((prev) => prev.filter((selectedId) => selectedId !== id));
  };

  const renameKin = (id: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;

    setKinList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, label: trimmed } : item))
    );
  };

  const toggleKinRecipient = (id: string) => {
    setSelectedKinIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    );
  };

  const selectAllKinRecipients = () => {
    setSelectedKinIds((prev) =>
      prev.length === kinList.length && kinList.every((kin) => prev.includes(kin.id))
        ? []
        : kinList.map((kin) => kin.id)
    );
  };

  return {
    kinIdInput,
    setKinIdInput,
    kinNameInput,
    setKinNameInput,
    kinList,
    currentKin,
    selectedKinIds,
    kinStatus,
    kinConnectionState,
    setKinConnectionState,
    kinSelectionState,
    connectKin,
    switchKin,
    disconnectKin,
    removeKin,
    renameKin,
    toggleKinRecipient,
    selectAllKinRecipients,
  };
}

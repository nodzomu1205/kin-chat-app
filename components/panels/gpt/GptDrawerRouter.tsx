"use client";

import React from "react";
import type { DrawerMode } from "@/components/panels/gpt/DrawerTabs";
import GptMetaDrawer from "@/components/panels/gpt/GptMetaDrawer";
import GptSettingsDrawer from "@/components/panels/gpt/GptSettingsDrawer";
import GptTaskDrawer from "@/components/panels/gpt/GptTaskDrawer";
import LibraryDrawer from "@/components/panels/gpt/LibraryDrawer";
import {
  buildDeviceImportOptions,
  buildGptMetaDrawerProps,
  buildGptSettingsDrawerProps,
  buildGptTaskDrawerProps,
  buildLibraryDrawerProps,
} from "@/components/panels/gpt/GptDrawerRouterHelpers";
import type {
  GptPanelChatProps,
  GptPanelHeaderProps,
  GptPanelProtocolProps,
  GptPanelReferenceProps,
  GptPanelSettingsProps,
  GptPanelTaskProps,
} from "@/components/panels/gpt/gptPanelTypes";
import type { LocalMemorySettingsInput } from "@/components/panels/gpt/gptPanelHelpers";

type Props = {
  activeDrawer: DrawerMode;
  header: GptPanelHeaderProps;
  chat: GptPanelChatProps;
  task: GptPanelTaskProps;
  protocol: GptPanelProtocolProps;
  references: GptPanelReferenceProps;
  settings: GptPanelSettingsProps;
  localSettings: LocalMemorySettingsInput;
  setLocalSettings: React.Dispatch<React.SetStateAction<LocalMemorySettingsInput>>;
  memoryUsed: number;
  memoryCapacity: number;
  recentCount: number;
  factCount: number;
  preferenceCount: number;
  listCount: number;
  memoryCapacityPreview: number;
  rolling5Usage: { inputTokens: number; outputTokens: number; totalTokens: number };
  totalUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  showMemoryContent: boolean;
  setShowMemoryContent: React.Dispatch<React.SetStateAction<boolean>>;
  toPositiveInt: (value: string, fallback: number) => number;
};

export default function GptDrawerRouter({
  activeDrawer,
  header,
  chat,
  task,
  protocol,
  references,
  settings,
  localSettings,
  setLocalSettings,
  memoryUsed,
  memoryCapacity,
  recentCount,
  factCount,
  preferenceCount,
  listCount,
  memoryCapacityPreview,
  rolling5Usage,
  totalUsage,
  showMemoryContent,
  setShowMemoryContent,
  toPositiveInt,
}: Props) {
  const handleToggleMemoryContent = () => {
    setShowMemoryContent((prev) => !prev);
  };

  const handleImportDeviceFile = async (file: File) => {
    await chat.onInjectFile(file, buildDeviceImportOptions(settings));
  };

  if (activeDrawer === "memory") {
    return (
      <GptMetaDrawer
        {...buildGptMetaDrawerProps({
          mode: "memory",
          header,
          chat,
          settings,
          memoryUsed,
          memoryCapacity,
          recentCount,
          factCount,
          preferenceCount,
          listCount,
          rolling5Usage,
          totalUsage,
          showMemoryContent,
          onToggleMemoryContent: handleToggleMemoryContent,
        })}
      />
    );
  }

  if (activeDrawer === "tokens") {
    return (
      <GptMetaDrawer
        {...buildGptMetaDrawerProps({
          mode: "tokens",
          header,
          chat,
          settings,
          memoryUsed,
          memoryCapacity,
          recentCount,
          factCount,
          preferenceCount,
          listCount,
          rolling5Usage,
          totalUsage,
          showMemoryContent,
          onToggleMemoryContent: handleToggleMemoryContent,
        })}
      />
    );
  }

  if (activeDrawer === "task") {
    return <GptTaskDrawer {...buildGptTaskDrawerProps(task, header.isMobile)} />;
  }

  if (activeDrawer === "received_docs") {
    return (
      <LibraryDrawer
        {...buildLibraryDrawerProps({
          header,
          references,
          settings,
          onImportDeviceFile: handleImportDeviceFile,
        })}
      />
    );
  }

  if (activeDrawer === "settings") {
    return (
      <GptSettingsDrawer
        {...buildGptSettingsDrawerProps({
          header,
          protocol,
          settings,
          localSettings,
          setLocalSettings,
          memoryCapacityPreview,
          toPositiveInt,
        })}
      />
    );
  }

  return null;
}


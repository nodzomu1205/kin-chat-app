"use client";

import React from "react";
import type {
  GptPanelProtocolProps,
  GptPanelSettingsProps,
} from "@/components/panels/gpt/gptPanelTypes";
import type { LocalMemorySettingsInput } from "@/components/panels/gpt/gptPanelHelpers";
import {
  buttonSecondaryWide,
} from "@/components/panels/gpt/gptPanelStyles";
import {
  SEARCH_MODE_PRESETS,
  sectionCard,
  tabButton,
} from "@/components/panels/gpt/GptSettingsSections";
import { GPT_SETTINGS_WORKSPACE_TEXT } from "@/components/panels/gpt/gptSettingsText";
import { WorkspaceSectionTitle } from "@/components/panels/gpt/GptSettingsLibrarySections";
import {
  ChatSettingsWorkspaceView,
  LibrarySettingsWorkspaceView,
  TaskSettingsWorkspaceView,
} from "@/components/panels/gpt/GptSettingsWorkspaceViews";
import {
  inferPrimarySearchModeFromEngines,
  isPrimarySearchMode,
  normalizeStoredSearchMode,
  type PrimarySearchMode,
} from "@/lib/search-domain/presets";
import type { SearchEngine, SearchMode } from "@/types/task";

export type SettingsWorkspaceView = "chat" | "task" | "library";

type Props = {
  activeView: SettingsWorkspaceView;
  onChangeView: (view: SettingsWorkspaceView) => void;
  settings: GptPanelSettingsProps;
  protocol: GptPanelProtocolProps;
  localSettings: LocalMemorySettingsInput;
  setLocalSettings: React.Dispatch<React.SetStateAction<LocalMemorySettingsInput>>;
  memoryCapacityPreview: number;
  toPositiveInt: (value: string, fallback: number) => number;
  isMobile?: boolean;
  onClose: () => void;
};

export default function GptSettingsWorkspace({
  activeView,
  onChangeView,
  settings,
  protocol,
  localSettings,
  setLocalSettings,
  memoryCapacityPreview,
  toPositiveInt,
  isMobile = false,
  onClose,
}: Props) {
  const [sourceDisplayCountInput, setSourceDisplayCountInput] = React.useState(
    String(settings.sourceDisplayCount)
  );

  React.useEffect(() => {
    setSourceDisplayCountInput(String(settings.sourceDisplayCount));
  }, [settings.sourceDisplayCount]);

  const normalizedSearchMode = normalizeStoredSearchMode(settings.searchMode);
  const activeSearchMode: PrimarySearchMode | undefined =
    settings.searchEngines.length > 0
      ? inferPrimarySearchModeFromEngines(settings.searchEngines) ?? undefined
      : isPrimarySearchMode(normalizedSearchMode)
        ? normalizedSearchMode
        : "normal";

  const setSearchPreset = (mode: PrimarySearchMode) => {
    settings.onChangeSearchMode(mode as SearchMode);
    settings.onChangeSearchEngines([...SEARCH_MODE_PRESETS[mode].engines]);
  };

  const toggleSearchEngine = (engine: SearchEngine) => {
    const next = settings.searchEngines.includes(engine)
      ? settings.searchEngines.filter((item) => item !== engine)
      : [...settings.searchEngines, engine];
    settings.onChangeSearchEngines(next);
    const inferred = inferPrimarySearchModeFromEngines(next);
    if (inferred) settings.onChangeSearchMode(inferred as SearchMode);
  };

  const commitSourceDisplayCount = () => {
    const normalized = sourceDisplayCountInput.replace(/[^\d]/g, "").trim();
    const nextValue = Math.max(
      1,
      Math.min(20, Number(normalized || settings.sourceDisplayCount || 1))
    );
    setSourceDisplayCountInput(String(nextValue));
    if (nextValue !== settings.sourceDisplayCount) {
      settings.onChangeSourceDisplayCount(nextValue);
    }
  };

  return (
    <div
      style={{
        flex: 1,
        height: "100%",
        minHeight: 0,
        overflow: "hidden auto",
        overflowY: "auto",
        scrollbarGutter: "stable",
        WebkitOverflowScrolling: "touch",
        padding: isMobile ? "14px 10px 12px 10px" : "18px 16px 16px 16px",
        background:
          "linear-gradient(180deg, rgba(241,245,249,0.94) 0%, rgba(236,253,245,0.9) 100%)",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 14,
          width: "min(980px, 100%)",
          margin: "0 auto",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            ...sectionCard,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
            borderRadius: 18,
            padding: isMobile ? 14 : 16,
          }}
        >
          <WorkspaceSectionTitle
            title={GPT_SETTINGS_WORKSPACE_TEXT.viewTitles[activeView]}
            subtitle={GPT_SETTINGS_WORKSPACE_TEXT.viewSubtitles[activeView]}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: isMobile ? "flex-start" : "flex-end",
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {(["chat", "task", "library"] as SettingsWorkspaceView[]).map((view) => (
                <button
                  key={view}
                  type="button"
                  style={tabButton(activeView === view)}
                  onClick={() => onChangeView(view)}
                >
                  {GPT_SETTINGS_WORKSPACE_TEXT.viewTabs[view]}
                </button>
              ))}
            </div>
            <button type="button" style={buttonSecondaryWide} onClick={onClose}>
              {GPT_SETTINGS_WORKSPACE_TEXT.close}
            </button>
          </div>
        </div>

        {activeView === "chat" ? (
          <ChatSettingsWorkspaceView
            isMobile={isMobile}
            settings={settings}
            localSettings={localSettings}
            setLocalSettings={setLocalSettings}
            memoryCapacityPreview={memoryCapacityPreview}
            toPositiveInt={toPositiveInt}
          />
        ) : null}

        {activeView === "task" ? (
          <TaskSettingsWorkspaceView protocol={protocol} settings={settings} />
        ) : null}

        {activeView === "library" ? (
          <LibrarySettingsWorkspaceView
            isMobile={isMobile}
            settings={settings}
            controls={{
              activeSearchMode,
              sourceDisplayCountInput,
              onSetSearchPreset: setSearchPreset,
              onToggleSearchEngine: toggleSearchEngine,
              onChangeSourceDisplayCountInput: setSourceDisplayCountInput,
              onCommitSourceDisplayCount: commitSourceDisplayCount,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

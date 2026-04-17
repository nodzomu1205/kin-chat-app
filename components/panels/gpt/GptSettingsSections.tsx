"use client";

import React from "react";
import {
  SEARCH_MODE_PRESETS,
  type PrimarySearchMode,
} from "@/lib/search-domain/presets";
import type { SearchEngine } from "@/types/task";
import type { LibraryReferenceMode } from "./gptPanelTypes";
import {
  helpTextStyle,
  inputStyle,
  labelStyle,
} from "./gptPanelStyles";
import {
  LabeledSelect,
  NumberField,
  ReadonlyStatField,
  sectionCard,
  selectStyle,
  subtleCard,
  tabButton,
  textAreaStyle,
  ToggleButtons,
} from "./GptSettingsShared";
import { GPT_SETTINGS_SECTION_TEXT } from "./gptSettingsText";
export { RulesSettingsSection } from "./GptSettingsRulesSection";
export { ProtocolSettingsSection } from "./GptSettingsProtocolSection";

const SEARCH_ENGINES: SearchEngine[] = [
  "google_search",
  "google_ai_mode",
  "google_news",
  "google_maps",
  "google_local",
  "youtube_search",
];

export function SearchSettingsSection(props: {
  isMobile?: boolean;
  activeSearchMode: PrimarySearchMode | undefined;
  searchLocation: string;
  searchEngines: SearchEngine[];
  sourceDisplayCountInput: string;
  onSetSearchPreset: (mode: PrimarySearchMode) => void;
  onToggleSearchEngine: (engine: SearchEngine) => void;
  onChangeSearchLocation: (value: string) => void;
  onChangeSourceDisplayCountInput: (value: string) => void;
  onCommitSourceDisplayCount: () => void;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={sectionCard}>
        <div style={{ ...labelStyle, marginBottom: 8 }}>
          {GPT_SETTINGS_SECTION_TEXT.searchPresetTitle}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["normal", "ai", "integrated", "news", "geo", "youtube"] as PrimarySearchMode[]).map(
            (mode) => (
              <button
                key={mode}
                type="button"
                style={tabButton(props.activeSearchMode === mode)}
                onClick={() => props.onSetSearchPreset(mode)}
              >
                {mode === "normal"
                  ? GPT_SETTINGS_SECTION_TEXT.searchPresetLabels.normal
                  : mode === "ai"
                    ? GPT_SETTINGS_SECTION_TEXT.searchPresetLabels.ai
                    : mode === "integrated"
                      ? GPT_SETTINGS_SECTION_TEXT.searchPresetLabels.integrated
                      : mode === "news"
                        ? GPT_SETTINGS_SECTION_TEXT.searchPresetLabels.news
                        : mode === "geo"
                          ? GPT_SETTINGS_SECTION_TEXT.searchPresetLabels.geo
                          : GPT_SETTINGS_SECTION_TEXT.searchPresetLabels.youtube}
              </button>
            )
          )}
        </div>
      </div>
      <div style={sectionCard}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: props.isMobile
              ? "1fr"
              : "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <div style={labelStyle}>{GPT_SETTINGS_SECTION_TEXT.locationLabel}</div>
            <input
              value={props.searchLocation}
              onChange={(e) => props.onChangeSearchLocation(e.target.value)}
              placeholder={GPT_SETTINGS_SECTION_TEXT.locationPlaceholder}
              style={inputStyle}
            />
            <div style={helpTextStyle}>
              {GPT_SETTINGS_SECTION_TEXT.locationHelp}
            </div>
          </div>
          <div>
            <div style={labelStyle}>{GPT_SETTINGS_SECTION_TEXT.enginesLabel}</div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              {SEARCH_ENGINES.map((engine) => (
                <button
                  key={engine}
                  type="button"
                  style={tabButton(props.searchEngines.includes(engine))}
                  onClick={() => props.onToggleSearchEngine(engine)}
                >
                  {engine}
                </button>
              ))}
            </div>
            <div style={helpTextStyle}>
              {GPT_SETTINGS_SECTION_TEXT.enginesHelp}
            </div>
          </div>
          <div>
            <NumberField
              label={GPT_SETTINGS_SECTION_TEXT.sourceDisplayCountLabel}
              value={props.sourceDisplayCountInput}
              onChange={(value) =>
                props.onChangeSourceDisplayCountInput(
                  value.replace(/[^\d]/g, "")
                )
              }
              onBlur={props.onCommitSourceDisplayCount}
              onEnter={props.onCommitSourceDisplayCount}
              help={GPT_SETTINGS_SECTION_TEXT.sourceDisplayCountHelp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LibrarySettingsSection(props: {
  isMobile?: boolean;
  autoLibraryReferenceEnabled: boolean;
  libraryReferenceMode: LibraryReferenceMode;
  libraryIndexResponseCount: number;
  libraryReferenceCount: number;
  libraryStorageMB: number;
  libraryReferenceEstimatedTokens: number;
  onChangeAutoLibraryReferenceEnabled: (value: boolean) => void;
  onChangeLibraryReferenceMode: (value: LibraryReferenceMode) => void;
  onChangeLibraryIndexResponseCount: (value: number) => void;
  onChangeLibraryReferenceCount: (value: number) => void;
}) {
  return (
    <div style={sectionCard}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: props.isMobile
            ? "1fr"
            : "repeat(3, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <ToggleButtons
          label={GPT_SETTINGS_SECTION_TEXT.autoLibraryReferenceLabel}
          checked={props.autoLibraryReferenceEnabled}
          onChange={props.onChangeAutoLibraryReferenceEnabled}
          help={GPT_SETTINGS_SECTION_TEXT.autoLibraryReferenceHelp}
        />
        <div style={subtleCard}>
          <LabeledSelect
            label={GPT_SETTINGS_SECTION_TEXT.libraryReferenceModeLabel}
            value={props.libraryReferenceMode}
            onChange={(value) =>
              props.onChangeLibraryReferenceMode(value as LibraryReferenceMode)
            }
          >
            <option value="summary_only">summary only</option>
            <option value="summary_with_excerpt">summary + excerpt</option>
          </LabeledSelect>
        </div>
        <NumberField
          label={GPT_SETTINGS_SECTION_TEXT.libraryIndexResponseCountLabel}
          value={String(props.libraryIndexResponseCount)}
          onChange={(value) =>
            props.onChangeLibraryIndexResponseCount(
              Number(value.replace(/[^\d]/g, "") || 1)
            )
          }
        />
        <NumberField
          label={GPT_SETTINGS_SECTION_TEXT.libraryReferenceCountLabel}
          value={String(props.libraryReferenceCount)}
          onChange={(value) =>
            props.onChangeLibraryReferenceCount(
              Number(value.replace(/[^\d]/g, "") || 0)
            )
          }
        />
        <ReadonlyStatField
          label={GPT_SETTINGS_SECTION_TEXT.libraryStorageLabel}
          value={`${props.libraryStorageMB.toFixed(3)} MB`}
        />
        <ReadonlyStatField
          label={GPT_SETTINGS_SECTION_TEXT.libraryEstimatedTokensLabel}
          value={`${GPT_SETTINGS_SECTION_TEXT.libraryEstimatedTokensValuePrefix}${props.libraryReferenceEstimatedTokens}`}
        />
      </div>
    </div>
  );
}

export { SEARCH_MODE_PRESETS, tabButton, sectionCard, subtleCard, selectStyle, textAreaStyle };


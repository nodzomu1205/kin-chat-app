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

const compactNumberFieldWidth = 220;
const compactStatFieldWidth = 240;

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
              maxWidth={compactNumberFieldWidth}
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
    <div style={{ ...sectionCard, display: "grid", gap: 10 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: props.isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        <InlineToggle
          label={GPT_SETTINGS_SECTION_TEXT.directLibraryReferenceLabel}
          checked={props.autoLibraryReferenceEnabled}
          onChange={props.onChangeAutoLibraryReferenceEnabled}
        />
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
        <NumberField
          label={GPT_SETTINGS_SECTION_TEXT.libraryIndexResponseCountLabel}
          value={String(props.libraryIndexResponseCount)}
          onChange={(value) =>
            props.onChangeLibraryIndexResponseCount(
              Number(value.replace(/[^\d]/g, "") || 1)
            )
          }
          maxWidth={compactNumberFieldWidth}
        />
        <NumberField
          label={GPT_SETTINGS_SECTION_TEXT.libraryReferenceCountLabel}
          value={String(props.libraryReferenceCount)}
          onChange={(value) =>
            props.onChangeLibraryReferenceCount(
              Number(value.replace(/[^\d]/g, "") || 0)
            )
          }
          maxWidth={compactNumberFieldWidth}
        />
        <ReadonlyStatField
          label={GPT_SETTINGS_SECTION_TEXT.libraryStorageLabel}
          value={`${props.libraryStorageMB.toFixed(3)} MB`}
          maxWidth={compactStatFieldWidth}
        />
        <ReadonlyStatField
          label={GPT_SETTINGS_SECTION_TEXT.libraryEstimatedTokensLabel}
          value={`${GPT_SETTINGS_SECTION_TEXT.libraryEstimatedTokensValuePrefix}${props.libraryReferenceEstimatedTokens}`}
          maxWidth={compactStatFieldWidth}
        />
      </div>
    </div>
  );
}

export function DbLibraryReferenceSettingsSection(props: {
  isMobile?: boolean;
  libraryRagReferenceEnabled: boolean;
  libraryRagReferenceCount: number;
  libraryRagCandidateCount: number;
  libraryRagSimilarityThreshold: number;
  onChangeLibraryRagReferenceEnabled: (value: boolean) => void;
  onChangeLibraryRagReferenceCount: (value: number) => void;
  onChangeLibraryRagCandidateCount: (value: number) => void;
  onChangeLibraryRagSimilarityThreshold: (value: number) => void;
}) {
  return (
    <div style={{ ...sectionCard, display: "grid", gap: 10 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: props.isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 10,
            alignItems: "start",
          }}
        >
          <InlineToggle
            label={GPT_SETTINGS_SECTION_TEXT.ragLibraryReferenceLabel}
            checked={props.libraryRagReferenceEnabled}
            onChange={props.onChangeLibraryRagReferenceEnabled}
          />
          <NumberField
            label={GPT_SETTINGS_SECTION_TEXT.ragLibraryReferenceCountLabel}
            value={String(props.libraryRagReferenceCount)}
            onChange={(value) =>
              props.onChangeLibraryRagReferenceCount(
                Number(value.replace(/[^\d]/g, "") || 0)
              )
            }
            maxWidth={compactNumberFieldWidth}
          />
          <CommittedNumberField
            label={GPT_SETTINGS_SECTION_TEXT.ragLibraryCandidateCountLabel}
            value={props.libraryRagCandidateCount}
            min={0}
            max={100000}
            emptyValue={0}
            onCommit={props.onChangeLibraryRagCandidateCount}
            maxWidth={compactNumberFieldWidth}
          />
          <CommittedDecimalField
            label={GPT_SETTINGS_SECTION_TEXT.ragLibrarySimilarityThresholdLabel}
            value={props.libraryRagSimilarityThreshold}
            min={0}
            max={1}
            onCommit={props.onChangeLibraryRagSimilarityThreshold}
            maxWidth={compactNumberFieldWidth}
          />
        </div>
    </div>
  );
}

function InlineToggle(props: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div>
      <div style={labelStyle}>{props.label}</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          style={tabButton(props.checked)}
          onClick={() => props.onChange(true)}
        >
          ON
        </button>
        <button
          type="button"
          style={tabButton(!props.checked)}
          onClick={() => props.onChange(false)}
        >
          OFF
        </button>
      </div>
    </div>
  );
}

export function ImageLibraryReferenceSettingsSection(props: {
  isMobile?: boolean;
  imageLibraryReferenceEnabled: boolean;
  imageLibraryReferenceCount: number;
  imageLibraryCardLimit: number;
  onChangeImageLibraryReferenceEnabled: (value: boolean) => void;
  onChangeImageLibraryReferenceCount: (value: number) => void;
  onChangeImageLibraryCardLimit: (value: number) => void;
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
          label={GPT_SETTINGS_SECTION_TEXT.imageLibraryReferenceEnabledLabel}
          checked={props.imageLibraryReferenceEnabled}
          onChange={props.onChangeImageLibraryReferenceEnabled}
        />
        <CommittedNumberField
          label={GPT_SETTINGS_SECTION_TEXT.imageLibraryReferenceCountLabel}
          value={props.imageLibraryReferenceCount}
          min={0}
          max={50}
          onCommit={props.onChangeImageLibraryReferenceCount}
          maxWidth={compactNumberFieldWidth}
        />
        <CommittedNumberField
          label={GPT_SETTINGS_SECTION_TEXT.imageLibraryCardLimitLabel}
          value={props.imageLibraryCardLimit}
          min={0}
          max={200}
          onCommit={props.onChangeImageLibraryCardLimit}
          maxWidth={compactNumberFieldWidth}
        />
      </div>
    </div>
  );
}

function CommittedNumberField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  emptyValue?: number;
  onCommit: (value: number) => void;
  maxWidth?: number | string;
}) {
  const [input, setInput] = React.useState(String(props.value));

  React.useEffect(() => {
    setInput(String(props.value));
  }, [props.value]);

  const commit = () => {
    const digits = input.replace(/[^\d]/g, "");
    const parsed = digits ? Number(digits) : (props.emptyValue ?? props.value);
    const next = Math.max(props.min, Math.min(props.max, parsed));
    setInput(String(next));
    if (next !== props.value) props.onCommit(next);
  };

  return (
    <NumberField
      label={props.label}
      value={input}
      onChange={(value) => setInput(value.replace(/[^\d]/g, ""))}
      onBlur={commit}
      onEnter={commit}
      maxWidth={props.maxWidth}
    />
  );
}

function CommittedDecimalField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
  maxWidth?: number | string;
}) {
  const [input, setInput] = React.useState(String(props.value));

  React.useEffect(() => {
    setInput(String(props.value));
  }, [props.value]);

  const commit = () => {
    const normalized = input
      .replace(/[^\d.]/g, "")
      .replace(/(\..*)\./g, "$1");
    const parsed = normalized ? Number(normalized) : props.value;
    const next = Number.isFinite(parsed)
      ? Math.max(props.min, Math.min(props.max, parsed))
      : props.value;
    const rounded = Math.round(next * 1000) / 1000;
    setInput(String(rounded));
    if (rounded !== props.value) props.onCommit(rounded);
  };

  return (
    <NumberField
      label={props.label}
      value={input}
      onChange={(value) =>
        setInput(value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"))
      }
      onBlur={commit}
      onEnter={commit}
      inputMode="decimal"
      maxWidth={props.maxWidth}
    />
  );
}

export { SEARCH_MODE_PRESETS, tabButton, sectionCard, subtleCard, selectStyle, textAreaStyle };


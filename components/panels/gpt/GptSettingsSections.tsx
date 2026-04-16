"use client";

import React from "react";
import {
  SEARCH_MODE_PRESETS,
  type PrimarySearchMode,
} from "@/lib/search-domain/presets";
import type { SearchEngine, SearchMode } from "@/types/task";
import type { LibraryReferenceMode } from "./gptPanelTypes";
import {
  buttonPrimary,
  buttonSecondaryWide,
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
        <div style={{ ...labelStyle, marginBottom: 8 }}>検索プリセット</div>
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
                  ? "標準"
                  : mode === "ai"
                    ? "AI"
                    : mode === "integrated"
                      ? "統合"
                      : mode === "news"
                        ? "News"
                        : mode === "geo"
                          ? "Maps / Local"
                          : "YouTube"}
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
            <div style={labelStyle}>Location</div>
            <input
              value={props.searchLocation}
              onChange={(e) => props.onChangeSearchLocation(e.target.value)}
              placeholder="例: Japan / Johannesburg, South Africa"
              style={inputStyle}
            />
            <div style={helpTextStyle}>
              Protocol の `LOCATION` に使う主要な地域設定です。
            </div>
          </div>
          <div>
            <div style={labelStyle}>Engines</div>
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
              利用可能: `google_search / google_ai_mode / google_news / google_maps / google_local / youtube_search`
            </div>
          </div>
          <div>
            <NumberField
              label="リンク表示件数"
              value={props.sourceDisplayCountInput}
              onChange={(value) =>
                props.onChangeSourceDisplayCountInput(
                  value.replace(/[^\d]/g, "")
                )
              }
              onBlur={props.onCommitSourceDisplayCount}
              onEnter={props.onCommitSourceDisplayCount}
              help="検索結果カードや関連リンクカードで表示する件数です。"
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
          label="ライブラリ自動参照"
          checked={props.autoLibraryReferenceEnabled}
          onChange={props.onChangeAutoLibraryReferenceEnabled}
          help="Kin の会話・投入文書・検索結果などをもとに、ライブラリ候補も参照対象に含めます。"
        />
        <div style={subtleCard}>
          <LabeledSelect
            label="ライブラリ参照モード"
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
          label="ライブラリ index 件数"
          value={String(props.libraryIndexResponseCount)}
          onChange={(value) =>
            props.onChangeLibraryIndexResponseCount(
              Number(value.replace(/[^\d]/g, "") || 1)
            )
          }
        />
        <NumberField
          label="ライブラリ参照件数"
          value={String(props.libraryReferenceCount)}
          onChange={(value) =>
            props.onChangeLibraryReferenceCount(
              Number(value.replace(/[^\d]/g, "") || 0)
            )
          }
        />
        <ReadonlyStatField
          label="ライブラリ容量"
          value={`${props.libraryStorageMB.toFixed(3)} MB`}
        />
        <ReadonlyStatField
          label="ライブラリ推定トークン"
          value={`約 ${props.libraryReferenceEstimatedTokens}`}
        />
      </div>
    </div>
  );
}

export { SEARCH_MODE_PRESETS, tabButton, sectionCard, subtleCard, selectStyle, textAreaStyle };


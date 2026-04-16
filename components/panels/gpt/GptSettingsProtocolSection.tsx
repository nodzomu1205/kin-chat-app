"use client";

import React from "react";
import {
  buttonPrimary,
  buttonSecondaryWide,
  helpTextStyle,
  labelStyle,
} from "./gptPanelStyles";
import {
  sectionCard,
  textAreaStyle,
  ToggleButtons,
} from "./GptSettingsShared";

function ProtocolAutomationSection(props: {
  autoSendKinSysInput: boolean;
  autoCopyKinSysResponseToGpt: boolean;
  autoSendGptSysInput: boolean;
  autoCopyGptSysResponseToKin: boolean;
  autoCopyFileIngestSysInfoToKin: boolean;
  onChangeAutoSendKinSysInput: (value: boolean) => void;
  onChangeAutoCopyKinSysResponseToGpt: (value: boolean) => void;
  onChangeAutoSendGptSysInput: (value: boolean) => void;
  onChangeAutoCopyGptSysResponseToKin: (value: boolean) => void;
  onChangeAutoCopyFileIngestSysInfoToKin: (value: boolean) => void;
}) {
  return (
    <div style={sectionCard}>
      <div style={{ ...labelStyle, marginBottom: 8 }}>自動送信</div>
      <div style={{ display: "grid", gap: 10 }}>
        <ToggleButtons
          label="A. Kin入力欄の SYS を自動送信"
          checked={props.autoSendKinSysInput}
          onChange={props.onChangeAutoSendKinSysInput}
          help="Kin入力欄に SYS ブロックが載ったら自動送信します。"
        />
        <ToggleButtons
          label="B. Kin最新レスの SYS を GPT入力欄へ自動転記"
          checked={props.autoCopyKinSysResponseToGpt}
          onChange={props.onChangeAutoCopyKinSysResponseToGpt}
          help="Kin の最新メッセージに SYS ブロックがあれば GPT入力欄へ自動転記します。"
        />
        <ToggleButtons
          label="C. GPT入力欄の SYS を自動送信"
          checked={props.autoSendGptSysInput}
          onChange={props.onChangeAutoSendGptSysInput}
          help="GPT入力欄に SYS ブロックが載ったら自動送信します。"
        />
        <ToggleButtons
          label="D. GPT最新レスの SYS を Kin入力欄へ自動転記"
          checked={props.autoCopyGptSysResponseToKin}
          onChange={props.onChangeAutoCopyGptSysResponseToKin}
          help="GPT の最新メッセージに SYS ブロックがあれば Kin入力欄へ自動転記します。"
        />
        <ToggleButtons
          label="E. 文書取込時に Kin入力欄へ自動転記（SYS_INFO フォーマット）"
          checked={props.autoCopyFileIngestSysInfoToKin}
          onChange={props.onChangeAutoCopyFileIngestSysInfoToKin}
          help="文書取込後、整形済みの SYS_INFO を Kin入力欄へ自動セットします。"
        />
      </div>
    </div>
  );
}

function ProtocolEditorSection(props: {
  protocolPrompt: string;
  protocolRulebook: string;
  onChangeProtocolPrompt: (value: string) => void;
  onChangeProtocolRulebook: (value: string) => void;
}) {
  return (
    <>
      <div style={sectionCard}>
        <div style={labelStyle}>プロンプト</div>
        <textarea
          value={props.protocolPrompt}
          onChange={(e) => props.onChangeProtocolPrompt(e.target.value)}
          style={{ ...textAreaStyle, minHeight: 120 }}
        />
      </div>

      <div style={sectionCard}>
        <div style={labelStyle}>ルールブック</div>
        <textarea
          value={props.protocolRulebook}
          onChange={(e) => props.onChangeProtocolRulebook(e.target.value)}
          style={{ ...textAreaStyle, minHeight: 260 }}
        />
        <div style={{ ...helpTextStyle, marginTop: 8 }}>
          検索プロトコルでは `ENGINE: google_search / google_ai_mode / google_news / google_local` と `LOCATION: Japan` のような明示設定を使えます。
        </div>
      </div>
    </>
  );
}

function ProtocolActionSection(props: {
  onResetProtocolDefaults: () => void;
  onSaveProtocolDefaults: () => void;
  onSetProtocolRulebookToKinDraft: () => void | Promise<void>;
  onSendProtocolRulebookToKin: () => void | Promise<void>;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        justifyContent: "flex-end",
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        style={buttonSecondaryWide}
        onClick={props.onResetProtocolDefaults}
      >
        既定値に戻す
      </button>
      <button
        type="button"
        style={buttonSecondaryWide}
        onClick={props.onSaveProtocolDefaults}
      >
        既定値として保存
      </button>
      <button
        type="button"
        style={buttonSecondaryWide}
        onClick={() => void props.onSetProtocolRulebookToKinDraft()}
      >
        Kin入力欄へセット
      </button>
      <button
        type="button"
        style={buttonPrimary}
        onClick={() => void props.onSendProtocolRulebookToKin()}
      >
        SYS_INFO として送信
      </button>
    </div>
  );
}

export function ProtocolSettingsSection(props: {
  autoSendKinSysInput: boolean;
  autoCopyKinSysResponseToGpt: boolean;
  autoSendGptSysInput: boolean;
  autoCopyGptSysResponseToKin: boolean;
  autoCopyFileIngestSysInfoToKin: boolean;
  protocolPrompt: string;
  protocolRulebook: string;
  onChangeAutoSendKinSysInput: (value: boolean) => void;
  onChangeAutoCopyKinSysResponseToGpt: (value: boolean) => void;
  onChangeAutoSendGptSysInput: (value: boolean) => void;
  onChangeAutoCopyGptSysResponseToKin: (value: boolean) => void;
  onChangeAutoCopyFileIngestSysInfoToKin: (value: boolean) => void;
  onChangeProtocolPrompt: (value: string) => void;
  onChangeProtocolRulebook: (value: string) => void;
  onResetProtocolDefaults: () => void;
  onSaveProtocolDefaults: () => void;
  onSetProtocolRulebookToKinDraft: () => void | Promise<void>;
  onSendProtocolRulebookToKin: () => void | Promise<void>;
}) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ProtocolAutomationSection
        autoSendKinSysInput={props.autoSendKinSysInput}
        autoCopyKinSysResponseToGpt={props.autoCopyKinSysResponseToGpt}
        autoSendGptSysInput={props.autoSendGptSysInput}
        autoCopyGptSysResponseToKin={props.autoCopyGptSysResponseToKin}
        autoCopyFileIngestSysInfoToKin={props.autoCopyFileIngestSysInfoToKin}
        onChangeAutoSendKinSysInput={props.onChangeAutoSendKinSysInput}
        onChangeAutoCopyKinSysResponseToGpt={
          props.onChangeAutoCopyKinSysResponseToGpt
        }
        onChangeAutoSendGptSysInput={props.onChangeAutoSendGptSysInput}
        onChangeAutoCopyGptSysResponseToKin={
          props.onChangeAutoCopyGptSysResponseToKin
        }
        onChangeAutoCopyFileIngestSysInfoToKin={
          props.onChangeAutoCopyFileIngestSysInfoToKin
        }
      />
      <ProtocolEditorSection
        protocolPrompt={props.protocolPrompt}
        protocolRulebook={props.protocolRulebook}
        onChangeProtocolPrompt={props.onChangeProtocolPrompt}
        onChangeProtocolRulebook={props.onChangeProtocolRulebook}
      />
      <ProtocolActionSection
        onResetProtocolDefaults={props.onResetProtocolDefaults}
        onSaveProtocolDefaults={props.onSaveProtocolDefaults}
        onSetProtocolRulebookToKinDraft={props.onSetProtocolRulebookToKinDraft}
        onSendProtocolRulebookToKin={props.onSendProtocolRulebookToKin}
      />
    </div>
  );
}

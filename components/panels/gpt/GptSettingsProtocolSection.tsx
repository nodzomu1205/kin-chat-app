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
      <div style={{ ...labelStyle, marginBottom: 8 }}>自動化フロー</div>
      <div style={{ display: "grid", gap: 10 }}>
        <ToggleButtons
          label="A. Kin入力後に SYS を自動送信"
          checked={props.autoSendKinSysInput}
          onChange={props.onChangeAutoSendKinSysInput}
          help="Kin に入力した直後、必要な SYS ブロックを自動送信します。"
        />
        <ToggleButtons
          label="B. Kin の SYS 応答を GPT 入力欄へ自動コピー"
          checked={props.autoCopyKinSysResponseToGpt}
          onChange={props.onChangeAutoCopyKinSysResponseToGpt}
          help="Kin の最新メッセージに SYS ブロックがあれば、GPT の入力欄へ自動反映します。"
        />
        <ToggleButtons
          label="C. GPT入力後に SYS を自動送信"
          checked={props.autoSendGptSysInput}
          onChange={props.onChangeAutoSendGptSysInput}
          help="GPT に入力した直後、必要な SYS ブロックを自動送信します。"
        />
        <ToggleButtons
          label="D. GPT の SYS 応答を Kin 入力欄へ自動コピー"
          checked={props.autoCopyGptSysResponseToKin}
          onChange={props.onChangeAutoCopyGptSysResponseToKin}
          help="GPT の最新メッセージに SYS ブロックがあれば、Kin の入力欄へ自動反映します。"
        />
        <ToggleButtons
          label="E. 文書取込後の SYS_INFO を Kin 入力欄へ自動コピー"
          checked={props.autoCopyFileIngestSysInfoToKin}
          onChange={props.onChangeAutoCopyFileIngestSysInfoToKin}
          help="ファイル取込後に生成された SYS_INFO を Kin 入力欄へ自動セットします。"
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
          検索プロトコルでは `ENGINE: google_search / google_ai_mode / google_news / google_local`
          と `LOCATION: Japan` のような設定を使えます。
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
        Kin 入力欄へセット
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

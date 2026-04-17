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
import { GPT_PROTOCOL_SETTINGS_TEXT } from "./gptSettingsText";

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
  const automationItems = [
    {
      checked: props.autoSendKinSysInput,
      onChange: props.onChangeAutoSendKinSysInput,
      text: GPT_PROTOCOL_SETTINGS_TEXT.automation[0],
    },
    {
      checked: props.autoCopyKinSysResponseToGpt,
      onChange: props.onChangeAutoCopyKinSysResponseToGpt,
      text: GPT_PROTOCOL_SETTINGS_TEXT.automation[1],
    },
    {
      checked: props.autoSendGptSysInput,
      onChange: props.onChangeAutoSendGptSysInput,
      text: GPT_PROTOCOL_SETTINGS_TEXT.automation[2],
    },
    {
      checked: props.autoCopyGptSysResponseToKin,
      onChange: props.onChangeAutoCopyGptSysResponseToKin,
      text: GPT_PROTOCOL_SETTINGS_TEXT.automation[3],
    },
    {
      checked: props.autoCopyFileIngestSysInfoToKin,
      onChange: props.onChangeAutoCopyFileIngestSysInfoToKin,
      text: GPT_PROTOCOL_SETTINGS_TEXT.automation[4],
    },
  ];

  return (
    <div style={sectionCard}>
      <div style={{ ...labelStyle, marginBottom: 8 }}>
        {GPT_PROTOCOL_SETTINGS_TEXT.automationTitle}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {automationItems.map(({ checked, onChange, text }) => (
          <ToggleButtons
            key={text.label}
            label={text.label}
            checked={checked}
            onChange={onChange}
            help={text.help}
          />
        ))}
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
        <div style={labelStyle}>{GPT_PROTOCOL_SETTINGS_TEXT.promptLabel}</div>
        <textarea
          value={props.protocolPrompt}
          onChange={(e) => props.onChangeProtocolPrompt(e.target.value)}
          style={{ ...textAreaStyle, minHeight: 120 }}
        />
      </div>

      <div style={sectionCard}>
        <div style={labelStyle}>{GPT_PROTOCOL_SETTINGS_TEXT.rulebookLabel}</div>
        <textarea
          value={props.protocolRulebook}
          onChange={(e) => props.onChangeProtocolRulebook(e.target.value)}
          style={{ ...textAreaStyle, minHeight: 260 }}
        />
        <div style={{ ...helpTextStyle, marginTop: 8 }}>
          {GPT_PROTOCOL_SETTINGS_TEXT.rulebookHelp}
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
        {GPT_PROTOCOL_SETTINGS_TEXT.resetDefaults}
      </button>
      <button
        type="button"
        style={buttonSecondaryWide}
        onClick={props.onSaveProtocolDefaults}
      >
        {GPT_PROTOCOL_SETTINGS_TEXT.saveDefaults}
      </button>
      <button
        type="button"
        style={buttonSecondaryWide}
        onClick={() => void props.onSetProtocolRulebookToKinDraft()}
      >
        {GPT_PROTOCOL_SETTINGS_TEXT.setKinDraft}
      </button>
      <button
        type="button"
        style={buttonPrimary}
        onClick={() => void props.onSendProtocolRulebookToKin()}
      >
        {GPT_PROTOCOL_SETTINGS_TEXT.sendSysInfo}
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

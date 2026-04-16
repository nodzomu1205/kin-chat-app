"use client";

import React from "react";
import {
  helpTextStyle,
  inputStyle,
  labelStyle,
} from "./gptPanelStyles";

export const sectionCard: React.CSSProperties = {
  border: "1px solid #dbe4e8",
  borderRadius: 12,
  background: "rgba(255,255,255,0.92)",
  padding: 12,
};

export const subtleCard: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  background: "#fbfdff",
  padding: 12,
};

export const selectStyle: React.CSSProperties = {
  height: 36,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
  padding: "0 12px",
};

export const textAreaStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #d1d5db",
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 13,
  lineHeight: 1.6,
  color: "#0f172a",
  resize: "vertical",
  background: "#fff",
  boxSizing: "border-box",
};

export const tabButton = (active: boolean): React.CSSProperties => ({
  height: 34,
  borderRadius: 999,
  border: active ? "1px solid #67e8f9" : "1px solid #cbd5e1",
  background: active ? "#ecfeff" : "#fff",
  color: active ? "#155e75" : "#475569",
  fontSize: 12,
  fontWeight: 800,
  padding: "0 12px",
  cursor: "pointer",
  lineHeight: 1,
});

export function CountBadge(props: {
  label: string;
  count: number;
  tone?: "info" | "warning" | "neutral";
}) {
  const toneStyle =
    props.tone === "warning"
      ? {
          background: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fcd34d",
        }
      : props.tone === "neutral"
        ? {
            background: "#f1f5f9",
            color: "#475569",
            border: "1px solid #cbd5e1",
          }
        : {
            background: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
          };

  return (
    <span
      style={{
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: 11,
        fontWeight: 800,
        ...toneStyle,
      }}
    >
      {props.label} {props.count}
    </span>
  );
}

export function SettingsItemCard(props: {
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div style={subtleCard}>
      <div style={{ fontSize: 12, fontWeight: 800 }}>{props.title}</div>
      {props.children}
    </div>
  );
}

export function SectionHeaderRow(props: {
  title: React.ReactNode;
  badges?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ ...labelStyle, marginBottom: 0 }}>{props.title}</div>
        {props.badges}
      </div>
      {props.action}
    </div>
  );
}

export function ItemActionRow(props: {
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  stacked?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: props.stacked ? undefined : "space-between",
        alignItems: props.stacked ? undefined : "center",
        gap: 8,
        marginTop: 10,
        flexWrap: "wrap",
      }}
    >
      {props.meta ? (
        <div
          style={
            props.stacked
              ? { ...helpTextStyle, width: "100%", marginTop: 0 }
              : helpTextStyle
          }
        >
          {props.meta}
        </div>
      ) : null}
      {props.actions}
    </div>
  );
}

export function ToggleButtons(props: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  help?: string;
}) {
  return (
    <div style={subtleCard}>
      <div style={{ ...labelStyle, marginBottom: 8 }}>{props.label}</div>
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
      {props.help ? (
        <div style={{ ...helpTextStyle, marginTop: 8 }}>{props.help}</div>
      ) : null}
    </div>
  );
}

export function LabeledSelect(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  help?: string;
}) {
  return (
    <div>
      <div style={labelStyle}>{props.label}</div>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={selectStyle}
      >
        {props.children}
      </select>
      {props.help ? <div style={helpTextStyle}>{props.help}</div> : null}
    </div>
  );
}

export function NumberField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  onBlur?: () => void;
  onEnter?: () => void;
}) {
  return (
    <div>
      <div style={labelStyle}>{props.label}</div>
      <input
        inputMode="numeric"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        onBlur={props.onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            props.onEnter?.();
          }
        }}
        style={inputStyle}
      />
      {props.help ? <div style={helpTextStyle}>{props.help}</div> : null}
    </div>
  );
}

export function TextField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <div style={labelStyle}>{props.label}</div>
      <input
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        style={inputStyle}
      />
      {props.help ? <div style={helpTextStyle}>{props.help}</div> : null}
    </div>
  );
}

export function LabeledTextArea(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
  minHeight?: number;
}) {
  return (
    <div>
      <div style={labelStyle}>{props.label}</div>
      <textarea
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        style={{
          ...textAreaStyle,
          minHeight: props.minHeight,
          whiteSpace: "pre-wrap",
        }}
      />
      {props.help ? <div style={helpTextStyle}>{props.help}</div> : null}
    </div>
  );
}

export function ReadonlyStatField(props: {
  label: string;
  value: string;
  help?: string;
}) {
  return (
    <div>
      <div style={labelStyle}>{props.label}</div>
      <div
        style={{
          ...inputStyle,
          display: "flex",
          alignItems: "center",
          background: "#f8fafc",
          fontWeight: 800,
        }}
      >
        {props.value}
      </div>
      {props.help ? <div style={helpTextStyle}>{props.help}</div> : null}
    </div>
  );
}

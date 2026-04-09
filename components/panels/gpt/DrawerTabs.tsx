"use client";

import React from "react";

export type TopTabKey =
  | "memory"
  | "tokens"
  | "task_draft"
  | "task_progress"
  | "received_docs";

export type DrawerMode = TopTabKey | "settings" | null;

function topTabStyle(active: boolean, isMobile: boolean): React.CSSProperties {
  return {
    height: isMobile ? 22 : 24,
    borderRadius: "0 0 9px 9px",
    border: "1px solid #cbd5e1",
    borderTop: active ? "none" : "1px solid #cbd5e1",
    background: active ? "#ffffff" : "#f8fafc",
    color: active ? "#0f766e" : "#475569",
    fontSize: isMobile ? 10 : 11,
    fontWeight: 800,
    padding: isMobile ? "0 7px" : "0 8px",
    boxShadow: active ? "0 4px 10px rgba(15,23,42,0.08)" : "none",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
    boxSizing: "border-box",
  };
}

export default function DrawerTabs({
  activeDrawer,
  isMobile,
  onChange,
}: {
  activeDrawer: DrawerMode;
  isMobile: boolean;
  onChange: (next: DrawerMode) => void;
}) {
  const toggle = (key: TopTabKey) => onChange(activeDrawer === key ? null : key);

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 0,
          borderTop: "1px solid rgba(255,255,255,0.36)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          transform: "translateY(calc(100% - 1px))",
          zIndex: 30,
          display: "flex",
          alignItems: "flex-start",
          gap: 3,
          maxWidth: "100%",
          overflowX: "auto",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <button type="button" onClick={() => toggle("memory")} style={topTabStyle(activeDrawer === "memory", isMobile)}>
          メモリ
        </button>
        <button type="button" onClick={() => toggle("tokens")} style={topTabStyle(activeDrawer === "tokens", isMobile)}>
          トークン
        </button>
        <button
          type="button"
          onClick={() => toggle("task_draft")}
          style={topTabStyle(activeDrawer === "task_draft", isMobile)}
        >
          タスク形成
        </button>
        <button
          type="button"
          onClick={() => toggle("task_progress")}
          style={topTabStyle(activeDrawer === "task_progress", isMobile)}
        >
          タスク進捗
        </button>
        <button
          type="button"
          onClick={() => toggle("received_docs")}
          style={topTabStyle(activeDrawer === "received_docs", isMobile)}
        >
          ライブラリ
        </button>
      </div>
    </>
  );
}

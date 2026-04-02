import type React from "react";
import type { KinStatus } from "./kinPanelTypes";

export const buttonPrimary: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 12,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 14,
};

export const buttonReset: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 20,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

export const buttonTransfer: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 12,
  border: "1px solid #99f6e4",
  background: "#ecfeff",
  color: "#0f766e",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 13,
};

export const buttonSwitch: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 14,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 22,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

export const headerActionButton: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.28)",
  background: "rgba(255,255,255,0.1)",
  color: "#fff",
  borderRadius: 999,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
  flexShrink: 0,
};

export const miniButton: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  borderRadius: 8,
  padding: "5px 9px",
  cursor: "pointer",
  fontSize: 12,
  whiteSpace: "nowrap",
  fontWeight: 600,
};

export const statusDotStyle = (status: KinStatus): React.CSSProperties => {
  const map = {
    idle: "#9ca3af",
    connected: "#22c55e",
    error: "#ef4444",
  } as const;

  return {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: map[status],
    boxShadow: "0 0 0 2px rgba(255,255,255,0.18)",
    flexShrink: 0,
  };
};

export const kinTileStyle = (active: boolean): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  background: active ? "#f7f2fb" : "#fff",
  border: active ? "1px solid #cdb7ea" : "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "8px 9px",
  minWidth: 0,
});

export const panelShellStyle = (isMobile: boolean): React.CSSProperties => ({
  flex: 1,
  width: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: isMobile ? 0 : 10,
  overflow: "hidden",
  backgroundImage: "url('/backgrounds/kin-bg.png')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundColor: "rgba(255,255,255,0.74)",
  backgroundBlendMode: "lighten",
  backdropFilter: "blur(2px)",
});

export const drawerWrapStyle: React.CSSProperties = {
  padding: 10,
  borderBottom: "1px solid #eee",
  background:
    "linear-gradient(180deg, rgba(252,250,255,0.94) 0%, rgba(250,246,255,0.92) 100%)",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

export const chatBodyStyle = (isMobile: boolean): React.CSSProperties => ({
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  backgroundColor: "rgba(255,255,255,0.78)",
  backgroundImage: "url('/backgrounds/kin-bg.png')",
  backgroundRepeat: "repeat",
  backgroundSize: isMobile ? "180px auto" : "220px auto",
  backgroundPosition: "center",
  backgroundBlendMode: "lighten",
});

export const footerStyle = (isMobile: boolean): React.CSSProperties => ({
  paddingTop: isMobile ? 8 : 10,
  paddingLeft: isMobile ? 8 : 10,
  paddingRight: isMobile ? 8 : 10,
  paddingBottom: isMobile
    ? "calc(env(safe-area-inset-bottom, 0px) + 8px)"
    : 10,
  borderTop: "1px solid rgba(148,163,184,0.22)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(250,245,255,0.96) 100%)",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

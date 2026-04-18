import type React from "react";

export const buttonPrimary: React.CSSProperties = {
  padding: "8px 14px",
  minWidth: 64,
  height: 40,
  borderRadius: 12,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

export const buttonSecondaryWide: React.CSSProperties = {
  padding: "8px 14px",
  minWidth: 72,
  height: 40,
  borderRadius: 12,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 14,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

export const buttonReset: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 16,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxSizing: "border-box",
};

export const buttonTransfer: React.CSSProperties = {
  padding: "0 12px",
  height: 32,
  borderRadius: 10,
  border: "1px solid #d8b4fe",
  background: "#faf5ff",
  color: "#7e22ce",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

export const buttonTranslate: React.CSSProperties = {
  padding: "0 12px",
  height: 32,
  borderRadius: 10,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

export const buttonReply: React.CSSProperties = {
  padding: "0 12px",
  height: 32,
  borderRadius: 10,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#15803d",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

export const buttonPolish: React.CSSProperties = {
  padding: "0 12px",
  height: 32,
  borderRadius: 10,
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#b45309",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

export const buttonTask: React.CSSProperties = {
  padding: "0 12px",
  height: 32,
  borderRadius: 10,
  border: "1px solid #c4b5fd",
  background: "#f5f3ff",
  color: "#6d28d9",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 12,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

export const buttonDeepen: React.CSSProperties = {
  padding: "0 12px",
  height: 32,
  borderRadius: 10,
  border: "1px solid #93c5fd",
  background: "#eff6ff",
  color: "#1d4ed8",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

export const buttonFile: React.CSSProperties = {
  padding: "0 12px",
  height: 32,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#6d28d9",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};

export const pillButton: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.35)",
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

export const buttonSwitch: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 16,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxSizing: "border-box",
};

export const iconButton: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 16,
  lineHeight: 1,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  boxSizing: "border-box",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #cfd8dc",
  boxSizing: "border-box",
  fontSize: 14,
};

export const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#374151",
  marginBottom: 4,
};

export const helpTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  lineHeight: 1.4,
};

export const statusDotStyle = (
  status: "idle" | "connected" | "error"
): React.CSSProperties => {
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

export const tokenCardStyle: React.CSSProperties = {
  border: "1px solid #dbe4e8",
  borderRadius: 18,
  background: "rgba(255,255,255,0.92)",
  padding: "14px 16px",
  minWidth: 0,
  boxShadow: "0 1px 0 rgba(15,23,42,0.03)",
};

export const tokenLeftLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  color: "#334155",
  whiteSpace: "nowrap",
};

export const tokenLineStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#0f172a",
  lineHeight: 1.55,
  fontWeight: 700,
};

export const tokenMetaStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  fontWeight: 500,
};

export const longValueStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#111827",
  fontWeight: 700,
  lineHeight: 1.5,
};

export const panelShellStyle = (isMobile: boolean): React.CSSProperties => {
  void isMobile;
  return {
    flex: 1,
    width: "100%",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 0,
    overflow: "visible",
    position: "relative",
    backgroundImage: "url('/backgrounds/gpt-bg.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundColor: "rgba(255,255,255,0.74)",
    backgroundBlendMode: "lighten",
    backdropFilter: "blur(2px)",
  };
};

export const drawerWrapStyle = (isMobile: boolean): React.CSSProperties => ({
  padding: isMobile ? "22px 10px 10px 10px" : "10px",
  borderBottom: "1px solid #e5e7eb",
  background:
    "linear-gradient(180deg, rgba(248,255,252,0.96) 0%, rgba(243,251,248,0.94) 100%)",
  flexShrink: 0,
  maxHeight: isMobile ? "50dvh" : "60dvh",
  overflowY: "auto",
  WebkitOverflowScrolling: "touch",
});

export const chatBodyStyle = (isMobile: boolean): React.CSSProperties => ({
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  backgroundColor: "rgba(255,255,255,0.78)",
  backgroundImage: "url('/backgrounds/gpt-bg.png')",
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
    "linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(236,253,245,0.96) 100%)",
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minHeight: isMobile ? undefined : 110,
  boxSizing: "border-box",
});

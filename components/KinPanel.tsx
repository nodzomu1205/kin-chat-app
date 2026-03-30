"use client";

import React, { useEffect, useState } from "react";
import ChatMessages from "@/components/ChatMessages";
import ChatTextarea from "@/components/ChatTextarea";
import type { KinProfile, Message } from "@/types/chat";

type Props = {
  kinIdInput: string;
  setKinIdInput: (value: string) => void;
  kinNameInput: string;
  setKinNameInput: (value: string) => void;
  connectKin: () => void;
  kinStatus: "idle" | "connected" | "error";
  currentKin: string | null;
  currentKinLabel: string | null;
  kinList: KinProfile[];
  switchKin: (id: string) => void;
  removeKin: (id: string) => void;
  renameKin: (id: string, label: string) => void;
  kinMessages: Message[];
  kinInput: string;
  setKinInput: (value: string) => void;
  sendToKin: () => void;
  sendLastKinToGptDraft: () => void;
  resetKinMessages: () => void;
  kinBottomRef: React.RefObject<HTMLDivElement | null>;
  isMobile?: boolean;
  onSwitchPanel?: () => void;
};

const buttonPrimary: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 14,
};

const buttonReset: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 600,
  whiteSpace: "nowrap",
  fontSize: 13,
};

const buttonTransfer: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #99f6e4",
  background: "#ecfeff",
  color: "#0f766e",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 13,
};

const buttonSwitch: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#f8fafc",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 13,
};

const connectHeaderButton: React.CSSProperties = {
  border: "1px solid #e9d5ff",
  background: "#ffffff",
  color: "#6a00ff",
  borderRadius: 999,
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700,
  whiteSpace: "nowrap",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.08)",
  flexShrink: 0,
};

const closeHeaderButton: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  borderRadius: 999,
  padding: "5px 8px",
  cursor: "pointer",
  fontSize: 11,
  fontWeight: 600,
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const miniButton: React.CSSProperties = {
  border: "1px solid #d1d5db",
  background: "#fff",
  borderRadius: 8,
  padding: "5px 9px",
  cursor: "pointer",
  fontSize: 12,
  whiteSpace: "nowrap",
  fontWeight: 600,
};

const statusBadgeStyle = (
  status: "idle" | "connected" | "error"
): React.CSSProperties => {
  const map = {
    idle: {
      background: "#f3f4f6",
      color: "#4b5563",
      border: "1px solid #e5e7eb",
    },
    connected: {
      background: "#ecfdf5",
      color: "#047857",
      border: "1px solid #a7f3d0",
    },
    error: {
      background: "#fef2f2",
      color: "#b91c1c",
      border: "1px solid #fecaca",
    },
  } as const;

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    whiteSpace: "nowrap",
    flexShrink: 0,
    ...map[status],
  };
};

const kinTileStyle = (active: boolean): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: 6,
  background: active ? "#f5f3ff" : "#fff",
  border: active ? "1px solid #c4b5fd" : "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "8px 9px",
  minWidth: 0,
});

export default function KinPanel(props: Props) {
  const {
    kinIdInput,
    setKinIdInput,
    kinNameInput,
    setKinNameInput,
    connectKin,
    kinStatus,
    currentKinLabel,
    kinList,
    currentKin,
    switchKin,
    removeKin,
    renameKin,
    kinMessages,
    kinInput,
    setKinInput,
    sendToKin,
    sendLastKinToGptDraft,
    resetKinMessages,
    kinBottomRef,
    isMobile = false,
    onSwitchPanel,
  } = props;

  const [showKinList, setShowKinList] = useState(!isMobile);
  const [showConnectForm, setShowConnectForm] = useState(
    !isMobile || kinList.length === 0
  );

  useEffect(() => {
    if (!isMobile) {
      setShowKinList(true);
      setShowConnectForm(true);
      return;
    }

    setShowConnectForm((prev) => {
      if (kinList.length === 0) return true;
      return prev;
    });
  }, [isMobile, kinList.length]);

  const currentKinName = currentKinLabel || "未選択";

  const headerButtonStyle = showConnectForm
    ? closeHeaderButton
    : connectHeaderButton;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: isMobile ? 0 : 10,
        overflow: "hidden",
        background: "rgba(255,255,255,0.62)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        style={{
          background: "#6a00ff",
          color: "#fff",
          padding: isMobile ? "8px 10px" : "10px 12px",
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Kindroid
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              minWidth: 0,
              maxWidth: isMobile ? 120 : 180,
              fontSize: isMobile ? 13 : 13,
              fontWeight: 800,
              color: "#fff",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.2,
              letterSpacing: 0.2,
              textAlign: "right",
            }}
            title={currentKinName}
          >
            {currentKinName}
          </div>

          <span style={statusBadgeStyle(kinStatus)}>{kinStatus}</span>

          <button
            type="button"
            onClick={() => setShowConnectForm((prev) => !prev)}
            style={headerButtonStyle}
          >
            {showConnectForm ? "閉じる" : "＋接続"}
          </button>
        </div>
      </div>

      <div
        style={{
          padding: isMobile ? 8 : 10,
          borderBottom: "1px solid #eee",
          background: "rgba(252,252,255,0.78)",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            border: "1px solid #ece7ff",
            background: "rgba(250,248,255,0.86)",
            borderRadius: 12,
            padding: "7px 9px",
          }}
        >
          <button
            type="button"
            onClick={() => setShowKinList((prev) => !prev)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              border: "1px solid #e9d5ff",
              background: "#faf5ff",
              borderRadius: 10,
              cursor: "pointer",
              padding: "6px 8px",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#5b21b6",
              }}
            >
              Kin一覧
            </span>

            <span
              style={{
                fontSize: 12,
                color: "#6d28d9",
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              {showKinList ? "閉じる ▲" : `開く ▼ (${kinList.length})`}
            </span>
          </button>

          {showKinList && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 6,
                maxHeight: isMobile ? 140 : 104,
                overflowY: "auto",
                paddingRight: 2,
                marginTop: 8,
              }}
            >
              {kinList.map((kin, index) => {
                const active = currentKin === kin.id;

                return (
                  <div key={`${kin.id}-${index}`} style={kinTileStyle(active)}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => switchKin(kin.id)}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          margin: 0,
                          cursor: "pointer",
                          minWidth: 0,
                          flex: 1,
                          textAlign: "left",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: active ? 700 : 600,
                            fontSize: 13,
                            color: "#111827",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                          title={kin.label}
                        >
                          {kin.label}
                        </div>
                      </button>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexShrink: 0,
                        }}
                      >
                        {active && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#6d28d9",
                              background: "#ede9fe",
                              border: "1px solid #d8b4fe",
                              borderRadius: 999,
                              padding: "2px 6px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            選択中
                          </span>
                        )}

                        <button
                          type="button"
                          style={miniButton}
                          onClick={() => removeKin(kin.id)}
                        >
                          削除
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={kin.id}
                    >
                      {kin.id}
                    </div>

                    <input
                      defaultValue={kin.label}
                      onBlur={(e) => renameKin(kin.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.currentTarget.blur();
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 8,
                        border: "1px solid #d1d5db",
                        fontSize: 12,
                        boxSizing: "border-box",
                        background: "#fff",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {showConnectForm && (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              background: "rgba(255,255,255,0.86)",
              padding: isMobile ? "8px" : "10px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#374151",
                }}
              >
                新規接続
              </div>

              <button
                type="button"
                onClick={() => setShowConnectForm(false)}
                style={{
                  ...miniButton,
                  padding: "4px 8px",
                  fontSize: 11,
                }}
              >
                閉じる
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                value={kinIdInput}
                onChange={(e) => setKinIdInput(e.target.value)}
                placeholder="Kin IDを入力"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  boxSizing: "border-box",
                  minWidth: 0,
                }}
              />

              <input
                value={kinNameInput}
                onChange={(e) => setKinNameInput(e.target.value)}
                placeholder="表示名（任意）"
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  boxSizing: "border-box",
                  minWidth: 0,
                }}
              />

              <button
                style={{
                  ...buttonPrimary,
                  width: isMobile ? "100%" : "auto",
                }}
                onClick={connectKin}
              >
                接続
              </button>
            </div>
          </div>
        )}
      </div>

      <div
  style={{
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.82)",
    backgroundImage: 'url("/chat-bg.png")',
    backgroundRepeat: "repeat",
    backgroundSize: isMobile ? "170px auto" : "210px auto",
    backgroundPosition: "top left",
  }}
>
  <ChatMessages messages={kinMessages} bottomRef={kinBottomRef} />
</div>

      <div
        style={{
          paddingTop: isMobile ? 8 : 10,
          paddingLeft: isMobile ? 8 : 10,
          paddingRight: isMobile ? 8 : 10,
          paddingBottom: isMobile
            ? "calc(env(safe-area-inset-bottom, 0px) + 8px)"
            : 10,
          borderTop: "1px solid #eee",
          background: "rgba(255,255,255,0.82)",
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            minHeight: 40,
            overflowX: "auto",
            paddingBottom: 2,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "nowrap",
              minWidth: "max-content",
              alignItems: "center",
            }}
          >
            {isMobile && onSwitchPanel && (
              <button style={buttonSwitch} onClick={onSwitchPanel}>
                切替
              </button>
            )}

            <button style={buttonTransfer} onClick={sendLastKinToGptDraft}>
              GPTに送る
            </button>

            <button style={buttonReset} onClick={resetKinMessages}>
              リセット
            </button>
          </div>

          <div style={{ flex: 1 }} />

          <button
            style={{
              ...buttonPrimary,
              flexShrink: 0,
            }}
            onClick={sendToKin}
          >
            送信
          </button>
        </div>

        <ChatTextarea
          value={kinInput}
          onChange={setKinInput}
          onSubmit={sendToKin}
          submitOnEnter={!isMobile}
        />
      </div>
    </div>
  );
}
import React from "react";
import type { KinProfile } from "@/types/chat";
import { buttonPrimary, kinTileStyle, miniButton } from "./kinPanelStyles";

type Props = {
  showKinList: boolean;
  showConnectForm: boolean;
  kinList: KinProfile[];
  currentKin: string | null;
  switchKin: (id: string) => void;
  removeKin: (id: string) => void;
  renameKin: (id: string, label: string) => void;
  kinIdInput: string;
  setKinIdInput: (value: string) => void;
  kinNameInput: string;
  setKinNameInput: (value: string) => void;
  connectKin: () => void;
  isMobile?: boolean;
};

export default function KinManagementDrawer({
  showKinList,
  showConnectForm,
  kinList,
  currentKin,
  switchKin,
  removeKin,
  renameKin,
  kinIdInput,
  setKinIdInput,
  kinNameInput,
  setKinNameInput,
  connectKin,
  isMobile = false,
}: Props) {
  if (!showKinList && !showConnectForm) return null;

  return (
    <>
      {showKinList && (
        <div
          style={{
            border: "1px solid #ede7f7",
            background: "rgba(250,248,255,0.9)",
            borderRadius: 12,
            padding: "8px 9px",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#6d4f97",
              marginBottom: 8,
            }}
          >
            Kin一覧
          </div>

          {kinList.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              まだ登録された Kin はありません。
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {kinList.map((kin) => {
                const active = kin.id === currentKin;

                return (
                  <div key={kin.id} style={kinTileStyle(active)}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
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
                              color: "#6d4f97",
                              background: "#f1e8fb",
                              border: "1px solid #dac8ef",
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
                        if (e.key === "Enter") e.currentTarget.blur();
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
      )}

      {showConnectForm && (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "rgba(255,255,255,0.9)",
            padding: isMobile ? "8px" : "10px",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#374151",
              marginBottom: 8,
            }}
          >
            新規接続
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
              type="button"
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
    </>
  );
}

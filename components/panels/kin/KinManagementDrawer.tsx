import React from "react";

const buttonPrimary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "none",
  background: "#6d4f97",
  color: "#fff",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 14,
};

const buttonSecondary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 700,
  whiteSpace: "nowrap",
  fontSize: 14,
};

const miniButton: React.CSSProperties = {
  padding: "6px 8px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 12,
  whiteSpace: "nowrap",
};

type Props = {
  showKinList: boolean;
  showConnectForm: boolean;
  kinList: { id: string; label: string }[];
  currentKin: string | null;
  switchKin: (id: string) => void;
  disconnectKin: () => void;
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
  disconnectKin,
  removeKin,
  renameKin,
  kinIdInput,
  setKinIdInput,
  kinNameInput,
  setKinNameInput,
  connectKin,
  isMobile = false,
}: Props) {
  return (
    <>
      {showKinList && (
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
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
              登録済みKin
            </div>

            <button
              type="button"
              style={{
                ...buttonSecondary,
                padding: "6px 10px",
                fontSize: 12,
              }}
              onClick={disconnectKin}
              disabled={!currentKin}
              title="どのKinとも接続しない状態にします"
            >
              接続解除
            </button>
          </div>

          {kinList.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>まだKinが登録されていません。</div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 8,
              }}
            >
              {kinList.map((kin) => {
                const active = kin.id === currentKin;

                return (
                  <div
                    key={kin.id}
                    style={{
                      border: active ? "1px solid #c4b5fd" : "1px solid #e5e7eb",
                      background: active ? "#faf5ff" : "#fff",
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
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
                            接続中
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
                        marginTop: 8,
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

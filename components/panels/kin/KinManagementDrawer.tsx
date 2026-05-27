import React from "react";
import { KIN_MANAGEMENT_TEXT } from "./kinManagementText";

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
  selectedKinIds: string[];
  switchKin: (id: string) => void;
  toggleKinRecipient: (id: string) => void;
  selectAllKinRecipients: () => void;
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
  selectedKinIds,
  switchKin,
  toggleKinRecipient,
  selectAllKinRecipients,
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
  const allRecipientsSelected =
    kinList.length > 0 && kinList.every((kin) => selectedKinIds.includes(kin.id));

  return (
    <>
      {showKinList ? (
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
              {KIN_MANAGEMENT_TEXT.savedKinTitle}
            </div>

            <button
              type="button"
              style={{
                ...buttonSecondary,
                padding: "6px 10px",
                fontSize: 12,
              }}
              onClick={selectAllKinRecipients}
              disabled={kinList.length === 0}
            >
              {allRecipientsSelected ? "ALL OFF" : "ALL"}
            </button>

            <button
              type="button"
              style={{
                ...buttonSecondary,
                padding: "6px 10px",
                fontSize: 12,
              }}
              onClick={disconnectKin}
              disabled={!currentKin}
              title={KIN_MANAGEMENT_TEXT.disconnectTitle}
            >
              {KIN_MANAGEMENT_TEXT.disconnect}
            </button>
          </div>

          {kinList.length === 0 ? (
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              {KIN_MANAGEMENT_TEXT.empty}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 8,
                maxHeight: isMobile ? 220 : 320,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {kinList.map((kin) => {
                const active = kin.id === currentKin;
                const selected = selectedKinIds.includes(kin.id);

                return (
                  <div
                    key={kin.id}
                    style={{
                      border: selected
                        ? "1px solid #c4b5fd"
                        : "1px solid #e5e7eb",
                      background: selected ? "#faf5ff" : "#fff",
                      borderRadius: 12,
                      padding: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        marginBottom: 8,
                        minWidth: 0,
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          color: "#4b5563",
                          cursor: "pointer",
                          flexShrink: 0,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleKinRecipient(kin.id)}
                        />
                        送信対象
                      </label>

                      <div
                        style={{
                          fontSize: 11,
                          color: "#6b7280",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textAlign: "right",
                          minWidth: 0,
                        }}
                        title={kin.id}
                      >
                        {kin.id}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: isMobile ? "wrap" : "nowrap",
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
                          minWidth: isMobile ? "40%" : 96,
                          maxWidth: isMobile ? "none" : 160,
                          flex: isMobile ? "1 1 40%" : "0 1 160px",
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

                      <input
                        defaultValue={kin.label}
                        onBlur={(event) => renameKin(kin.id, event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") event.currentTarget.blur();
                        }}
                        style={{
                          flex: isMobile ? "1 1 100%" : "0 1 110px",
                          minWidth: isMobile ? "100%" : 90,
                          maxWidth: isMobile ? "none" : 110,
                          padding: "6px 8px",
                          borderRadius: 8,
                          border: "1px solid #d1d5db",
                          fontSize: 12,
                          boxSizing: "border-box",
                          background: "#fff",
                        }}
                      />

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          flexShrink: 0,
                          marginLeft: isMobile ? 0 : "auto",
                        }}
                      >
                        <button
                          type="button"
                          style={{
                            ...miniButton,
                            border: active
                              ? "1px solid #c4b5fd"
                              : "1px solid #d1d5db",
                            background: active ? "#f1e8fb" : "#fff",
                            color: active ? "#6d4f97" : "#374151",
                          }}
                          onClick={() => switchKin(kin.id)}
                        >
                          タスク実行
                        </button>

                        {active ? (
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
                            ON
                          </span>
                        ) : null}

                        <button
                          type="button"
                          style={miniButton}
                          onClick={() => removeKin(kin.id)}
                        >
                          {KIN_MANAGEMENT_TEXT.remove}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {showConnectForm ? (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "rgba(255,255,255,0.9)",
            padding: isMobile ? "8px" : "10px",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>
            {KIN_MANAGEMENT_TEXT.newConnectionTitle}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={kinIdInput}
              onChange={(event) => setKinIdInput(event.target.value)}
              placeholder={KIN_MANAGEMENT_TEXT.kinIdPlaceholder}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#fff",
              }}
            />

            <input
              value={kinNameInput}
              onChange={(event) => setKinNameInput(event.target.value)}
              placeholder={KIN_MANAGEMENT_TEXT.displayNamePlaceholder}
              style={{
                width: isMobile ? 84 : 120,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#fff",
              }}
            />

            <button type="button" style={buttonPrimary} onClick={connectKin}>
              {KIN_MANAGEMENT_TEXT.connectButton}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

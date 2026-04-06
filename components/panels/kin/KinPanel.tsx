"use client";

import React, { useEffect, useState } from "react";
import ChatMessages from "@/components/ChatMessages";
import type { KinPanelProps } from "./kinPanelTypes";
import KinHeader from "./KinHeader";
import KinManagementDrawer from "./KinManagementDrawer";
import KinToolbar from "./KinToolbar";
import KinComposer from "./KinComposer";
import {
  chatBodyStyle,
  drawerWrapStyle,
  footerStyle,
  panelShellStyle,
} from "./kinPanelStyles";

export default function KinPanel(props: KinPanelProps) {
  const {
    kinIdInput,
    setKinIdInput,
    kinNameInput,
    setKinNameInput,
    connectKin,
    disconnectKin,
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
    pendingInjectionCurrentPart,
    pendingInjectionTotalParts,
    kinBottomRef,
    isMobile = false,
    onSwitchPanel,
    loading,
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

  return (
    <div
      style={{
        ...panelShellStyle(isMobile),
        height: "100%",
        minHeight: 0,
        overflow: "visible",
      }}
    >
      <KinHeader
        currentKinLabel={currentKinLabel}
        kinStatus={kinStatus}
        onToggleKinList={() => setShowKinList((prev) => !prev)}
        onToggleConnectForm={() => setShowConnectForm((prev) => !prev)}
        isMobile={isMobile}
      />

      {(showKinList || showConnectForm) && (
        <div style={drawerWrapStyle}>
          <KinManagementDrawer
            showKinList={showKinList}
            showConnectForm={showConnectForm}
            kinList={kinList}
            currentKin={currentKin}
            switchKin={switchKin}
            disconnectKin={disconnectKin}
            removeKin={removeKin}
            renameKin={renameKin}
            kinIdInput={kinIdInput}
            setKinIdInput={setKinIdInput}
            kinNameInput={kinNameInput}
            setKinNameInput={setKinNameInput}
            connectKin={connectKin}
            isMobile={isMobile}
          />
        </div>
      )}

      <div
        style={{
          ...chatBodyStyle(isMobile),
          position: "relative",
          flex: 1,
          minHeight: 0,
        }}
      >
        <ChatMessages
            messages={kinMessages}
            bottomRef={kinBottomRef}
            loadingText={loading ? "Kindroidが応答中…" : null}
          />
      </div>

      <div style={footerStyle(isMobile)}>
        {pendingInjectionTotalParts > 0 && (
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "#6d4f97",
              background: "#f5f3ff",
              border: "1px solid #ddd6fe",
              borderRadius: 10,
              padding: "8px 10px",
              marginBottom: 8,
            }}
          >
            📦 注入送信中 {pendingInjectionCurrentPart}/{pendingInjectionTotalParts}
          </div>
        )}

        <KinToolbar
          isMobile={isMobile}
          onSwitchPanel={onSwitchPanel}
          onTransfer={sendLastKinToGptDraft}
          onReset={resetKinMessages}
        />

        <KinComposer
          value={kinInput}
          onChange={setKinInput}
          onSubmit={sendToKin}
          loading={loading}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import ChatMessages from "@/components/ChatMessages";
import {
  createInitialKinPanelVisibility,
  getKinLoadingText,
  getKinPendingInjectionLabel,
  resolveKinPanelVisibility,
  shouldShowKinManagementDrawer,
  toggleKinPanelConnectVisibility,
  toggleKinPanelListVisibility,
} from "@/lib/app/ui-state/kinPanelVisibility";
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
  const [visibilityState, setVisibilityState] = useState(() =>
    createInitialKinPanelVisibility({
      isMobile,
      kinCount: kinList.length,
    })
  );
  const visibility = resolveKinPanelVisibility(visibilityState, {
    isMobile,
    kinCount: kinList.length,
  });

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
        onToggleKinList={() =>
          setVisibilityState((prev) => toggleKinPanelListVisibility(prev))
        }
        onToggleConnectForm={() =>
          setVisibilityState((prev) =>
            toggleKinPanelConnectVisibility(prev, {
              isMobile,
              kinCount: kinList.length,
            })
          )
        }
        isMobile={isMobile}
      />

      {shouldShowKinManagementDrawer(visibility) && (
        <div style={drawerWrapStyle}>
          <KinManagementDrawer
            showKinList={visibility.showKinList}
            showConnectForm={visibility.showConnectForm}
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
          loadingText={getKinLoadingText(loading)}
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
            {getKinPendingInjectionLabel({
              currentPart: pendingInjectionCurrentPart,
              totalParts: pendingInjectionTotalParts,
            })}
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

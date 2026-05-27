"use client";

import React, { useState } from "react";
import ChatMessages from "@/components/message/ChatMessages";
import {
  buildKinChatContextEntriesFromMessages,
  buildKinToKinChatContext,
  buildKinUserMessageWithRecentContext,
  resolveKinChatContextCount,
} from "@/lib/app/kin-to-kin/kinToKinChat";
import {
  createInitialKinPanelVisibility,
  getKinLoadingText,
  getKinPendingInjectionLabel,
  resolveKinPanelVisibility,
  shouldShowKinManagementDrawer,
  toggleKinPanelConnectVisibility,
} from "@/lib/app/ui-state/kinPanelVisibility";
import type { KinPanelProps } from "./kinPanelTypes";
import KinHeader from "./KinHeader";
import KinManagementDrawer from "./KinManagementDrawer";
import KinToolbar from "./KinToolbar";
import KinComposer from "./KinComposer";
import KinToKinChatDrawer from "./KinToKinChatDrawer";
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
    selectedKinIds,
    switchKin,
    toggleKinRecipient,
    selectAllKinRecipients,
    removeKin,
    renameKin,
    kinMessages,
    kinInput,
    setKinInput,
    sendKinMessage,
    sendToKin,
    sendKinToKinMessage,
    requestKinToKinSummary,
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
  const [showKinToKinChat, setShowKinToKinChat] = useState(false);
  const [kinChatContextCountInput, setKinChatContextCountInput] = useState("0");
  const visibility = resolveKinPanelVisibility(visibilityState, {
    isMobile,
    kinCount: kinList.length,
  });
  const lastMessage = kinMessages[kinMessages.length - 1];
  const selectedKinLabels = selectedKinIds
    .map((id) => kinList.find((kin) => kin.id === id)?.label)
    .filter((label): label is string => Boolean(label));
  const headerKinLabel =
    selectedKinLabels.length > 1
      ? `${selectedKinLabels[0]} +${selectedKinLabels.length - 1}`
      : selectedKinLabels[0] || currentKinLabel;
  const isSendingSingleSysInjection =
    loading &&
    pendingInjectionTotalParts === 0 &&
    lastMessage?.role === "user" &&
    /<<SYS_(?:INFO|TASK)>>/.test(lastMessage.text || "");
  const injectionCurrentPart = isSendingSingleSysInjection
    ? 1
    : pendingInjectionCurrentPart;
  const injectionTotalParts = isSendingSingleSysInjection
    ? 1
    : pendingInjectionTotalParts;
  const sendKinInputWithContext = () => {
    const displayText = kinInput.trim();
    if (!displayText) {
      void sendToKin();
      return;
    }
    if (/<<SYS_/i.test(displayText)) {
      void sendToKin();
      return;
    }
    const recentContext = buildKinToKinChatContext(
      buildKinChatContextEntriesFromMessages(kinMessages),
      resolveKinChatContextCount(kinChatContextCountInput)
    );
    void sendKinMessage(
      buildKinUserMessageWithRecentContext({
        message: displayText,
        recentContext,
      }),
      { userMessageText: displayText }
    );
  };
  const closeKinDrawers = () => {
    setVisibilityState({ showKinList: false, showConnectForm: false });
  };
  const toggleKinListDrawer = () => {
    setShowKinToKinChat(false);
    setVisibilityState((prev) => ({
      showKinList: !prev.showKinList,
      showConnectForm: false,
    }));
  };
  const toggleConnectDrawer = () => {
    setShowKinToKinChat(false);
    setVisibilityState((prev) =>
      toggleKinPanelConnectVisibility(
        { showKinList: false, showConnectForm: prev.showConnectForm },
        {
          isMobile,
          kinCount: kinList.length,
        }
      )
    );
  };
  const toggleKinToKinChatDrawer = () => {
    closeKinDrawers();
    setShowKinToKinChat((current) => !current);
  };

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
        currentKinLabel={headerKinLabel}
        kinStatus={kinStatus}
        onToggleKinList={toggleKinListDrawer}
        onToggleKinToKinChat={toggleKinToKinChatDrawer}
        onToggleConnectForm={toggleConnectDrawer}
        kinToKinChatOpen={showKinToKinChat}
        isMobile={isMobile}
      />

      {shouldShowKinManagementDrawer(visibility) && (
        <div style={drawerWrapStyle}>
          <KinManagementDrawer
            showKinList={visibility.showKinList}
            showConnectForm={visibility.showConnectForm}
            kinList={kinList}
            currentKin={currentKin}
            selectedKinIds={selectedKinIds}
            switchKin={switchKin}
            toggleKinRecipient={toggleKinRecipient}
            selectAllKinRecipients={selectAllKinRecipients}
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

      {showKinToKinChat && (
        <KinToKinChatDrawer
          kinList={kinList}
          chatMessages={kinMessages}
          contextCountInput={kinChatContextCountInput}
          setContextCountInput={setKinChatContextCountInput}
          sendKinToKinMessage={sendKinToKinMessage}
          requestSummary={requestKinToKinSummary}
          isMobile={isMobile}
        />
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
        {injectionTotalParts > 0 && (
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
              currentPart: injectionCurrentPart,
              totalParts: injectionTotalParts,
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
          onSubmit={sendKinInputWithContext}
          loading={loading}
          isMobile={isMobile}
        />
      </div>
    </div>
  );
}
